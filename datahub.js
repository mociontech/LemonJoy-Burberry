const DATAHUB_QUEUE_KEY = "datahub:pending:v1";
const ENDPOINTS = {
  attendees: "attendees",
  experiences: "experiences"
};

const datahubConfig = {
  url: import.meta.env.VITE_DATAHUB_URL || "",
  token: import.meta.env.VITE_DATAHUB_TOKEN || "",
  eventId: import.meta.env.VITE_DATAHUB_EVENT_ID || "",
  experienceId: import.meta.env.VITE_DATAHUB_EXPERIENCE_ID || "",
  experienceName: import.meta.env.VITE_EXPERIENCE_NAME || "Burberry 3D"
};

let retryInProgress = false;
const inFlightKeys = new Set();

function getExperienceName(fallback = "Burberry 3D") {
  return datahubConfig.experienceName || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function slugify(value, fallback = "experiencia") {
  const slug = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
  return slug || fallback;
}

function createParticipantIdentity({ firstName, lastName, source = getExperienceName() }) {
  const cleanFirstName = normalizeText(firstName);
  const cleanLastName = normalizeText(lastName);
  const fullName = normalizeText(`${cleanFirstName} ${cleanLastName}`);
  const localPart = slugify(`${cleanFirstName}.${cleanLastName}`, "participante");
  const domainPart = slugify(source, "experiencia");
  return {
    fullName,
    email: `${localPart}@${domainPart}.local`
  };
}

function createSessionMetadata() {
  return {
    sessionId: createSessionId(),
    startedAt: nowIso()
  };
}

function buildDatahubUrl(endpointType) {
  const endpoint = ENDPOINTS[endpointType];
  if (!endpoint) {
    throw new Error(`Endpoint Datahub no soportado: ${endpointType}`);
  }

  const configuredUrl = datahubConfig.url.trim();
  const url = new URL(configuredUrl, window.location.origin);
  const segments = url.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (lastSegment === ENDPOINTS.attendees || lastSegment === ENDPOINTS.experiences) {
    segments[segments.length - 1] = endpoint;
  } else {
    segments.push(endpoint);
  }

  url.pathname = `/${segments.join("/")}`;
  return url.toString();
}

function hasConfig(endpointType) {
  if (!datahubConfig.url || !datahubConfig.token || !datahubConfig.eventId) return false;
  if (endpointType === ENDPOINTS.experiences && !datahubConfig.experienceId) return false;
  return true;
}

function safeQueue() {
  return {
    attendees: [],
    experiences: []
  };
}

function readQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATAHUB_QUEUE_KEY) || "null");
    return {
      ...safeQueue(),
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch {
    return safeQueue();
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(DATAHUB_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage can fail in private mode; the experience must keep running.
  }
}

function getRecordEmail(payload) {
  return payload?.records?.[0]?.email || "";
}

function getDedupeKey(endpointType, payload) {
  const record = payload?.records?.[0] || {};
  if (endpointType === ENDPOINTS.attendees) {
    return `${endpointType}:${payload.eventId}:${payload.source}:${record.email}`;
  }
  return `${endpointType}:${payload.eventId}:${payload.experienceId}:${record.email}:${record.data?.sessionId || ""}`;
}

function removeQueued(endpointType, dedupeKey) {
  const queue = readQueue();
  queue[endpointType] = (queue[endpointType] || []).filter((item) => item.dedupeKey !== dedupeKey);
  writeQueue(queue);
}

function queueDatahubRequest(endpointType, payload) {
  const queue = readQueue();
  const dedupeKey = getDedupeKey(endpointType, payload);
  const items = queue[endpointType] || [];

  if (!items.some((item) => item.dedupeKey === dedupeKey)) {
    items.push({
      id: createSessionId(),
      dedupeKey,
      endpointType,
      payload,
      attempts: 0,
      createdAt: nowIso(),
      lastAttemptAt: null
    });
  }

  queue[endpointType] = items;
  writeQueue(queue);
}

async function postDatahub(endpointType, payload) {
  const response = await fetch(buildDatahubUrl(endpointType), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${datahubConfig.token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Datahub ${endpointType} respondio ${response.status}`);
  }

  return {
    ok: true,
    status: response.status
  };
}

async function sendOrQueue(endpointType, payload) {
  if (!hasConfig(endpointType)) {
    return {
      ok: false,
      queued: false,
      reason: "missing_datahub_config"
    };
  }

  const dedupeKey = getDedupeKey(endpointType, payload);
  if (inFlightKeys.has(dedupeKey)) {
    return {
      ok: false,
      queued: false,
      reason: "duplicate_in_flight"
    };
  }

  inFlightKeys.add(dedupeKey);
  try {
    const result = await postDatahub(endpointType, payload);
    removeQueued(endpointType, dedupeKey);
    return result;
  } catch (error) {
    queueDatahubRequest(endpointType, payload);
    return {
      ok: false,
      queued: true,
      error
    };
  } finally {
    inFlightKeys.delete(dedupeKey);
  }
}

async function retryDatahubQueue() {
  if (retryInProgress) return;
  retryInProgress = true;

  try {
    const queue = readQueue();

    for (const endpointType of [ENDPOINTS.attendees, ENDPOINTS.experiences]) {
      if (!hasConfig(endpointType)) continue;

      const remaining = [];
      const items = queue[endpointType] || [];

      for (const item of items) {
        const dedupeKey = item.dedupeKey || getDedupeKey(endpointType, item.payload);
        if (inFlightKeys.has(dedupeKey)) {
          remaining.push(item);
          continue;
        }

        inFlightKeys.add(dedupeKey);
        try {
          await postDatahub(endpointType, item.payload);
        } catch {
          remaining.push({
            ...item,
            dedupeKey,
            attempts: (item.attempts || 0) + 1,
            lastAttemptAt: nowIso()
          });
        } finally {
          inFlightKeys.delete(dedupeKey);
        }
      }

      queue[endpointType] = remaining;
      writeQueue(queue);
    }
  } finally {
    retryInProgress = false;
  }
}

function setupDatahubRetry() {
  void retryDatahubQueue();
  window.addEventListener("online", () => {
    void retryDatahubQueue();
  });
}

function buildAttendeePayload({ fullName, email, checkInAt = nowIso() }) {
  return {
    eventId: datahubConfig.eventId,
    source: getExperienceName(),
    sentAt: nowIso(),
    records: [
      {
        fullName,
        email,
        checkInAt
      }
    ]
  };
}

function buildExperiencePayload({
  email,
  sessionId,
  startedAt,
  endedAt = nowIso(),
  score = 0,
  bonusScore = 0,
  data = {}
}) {
  return {
    eventId: datahubConfig.eventId,
    experienceId: datahubConfig.experienceId,
    source: getExperienceName(),
    sentAt: endedAt,
    records: [
      {
        email,
        play_timestamp: startedAt,
        score,
        bonusScore,
        data: {
          sessionId,
          startedAt,
          endedAt,
          ...data
        }
      }
    ]
  };
}

async function registrarAsistenteDatahub(attendee) {
  return sendOrQueue(ENDPOINTS.attendees, buildAttendeePayload(attendee));
}

async function registrarExperienciaDatahub(experience) {
  return sendOrQueue(ENDPOINTS.experiences, buildExperiencePayload(experience));
}

export {
  createParticipantIdentity,
  createSessionMetadata,
  getExperienceName,
  registrarAsistenteDatahub,
  registrarExperienciaDatahub,
  retryDatahubQueue,
  setupDatahubRetry
};
