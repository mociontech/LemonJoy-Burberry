import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import {
  createParticipantIdentity,
  createSessionMetadata,
  getExperienceName,
  registrarAsistenteDatahub,
  registrarExperienciaDatahub,
  setupDatahubRetry
} from "./datahub.js";

const LIONESS_URL = "/3D/Leona_Solo_Caminando_3.glb";
const COIN_URL = "/3D/Moneda_5.glb";
const LANDSCAPE_URL = "/3D/Landscape11.glb";
const HDRI_URL = "/3D/tocznabiel-field_2K_05775087-3a0c-4004-9969-49472a79f198.exr";
const SKY_BACKDROP_URL = "/Images/Cielo.png";
const EXPERIENCE_KEY = "burberry_goddess_3d";
const ENABLE_CAMERA_TUNER = false;
const QUIZ_TRIGGER_SCORE = 5;
const QUIZ_FEEDBACK_DELAY_MS = 900;
const QUIZ_REMINDER_DELAY_MS = 5000;
const PLAYER_SPEED = 4.4;
const PLAYER_ROTATE_SPEED = 10;
const PLAYER_COLLISION_RADIUS = 0.78;
const COIN_COLLISION_RADIUS = 0.78;
const COIN_RESPAWN_DELAY_MS = 1200;
const LIONESS_SCALE = 0.0160;
const COIN_SCALE = 0.5;
const MODEL_FORWARD_YAW_OFFSET = -Math.PI / 2;
const BOARD_HALF_X = 8.8;
const BOARD_HALF_Z = 7.8;
const PLATFORM_SURFACE_Y = 0.1;
const LIONESS_SURFACE_OFFSET = 0.045;
const COIN_SURFACE_OFFSET = 0.72;
const CACTUS_SURFACE_OFFSET = 0.28;
const CRYSTAL_SURFACE_OFFSET = 0.5;
const CAMERA_FRUSTUM = 20;
const CAMERA_POSITION = new THREE.Vector3(0, 10, 38);
const SCENE_LOOK_AT = new THREE.Vector3(0, 1.05, 0.2);
const CAMERA_FOLLOW_PLAYER = true;
const CAMERA_FOLLOW_LERP = 4.5;
const CAMERA_VIEW_SHIFT_Y = 3;
const CAMERA_PRESETS = {
  low: {
    position: new THREE.Vector3(14, 10.3, 25),
    target: new THREE.Vector3(0, 1, 0.45),
    frustum: 31
  },
  mid: {
    position: CAMERA_POSITION.clone(),
    target: SCENE_LOOK_AT.clone(),
    frustum: CAMERA_FRUSTUM
  },
  high: {
    position: new THREE.Vector3(20, 14.5, 31),
    target: new THREE.Vector3(0, 1.2, 0),
    frustum: 39
  }
};
const LANDSCAPE_TARGET_SIZE = 99;
const LANDSCAPE_ROTATION_Y = 0;
const SKY_BACKDROP_HEIGHT = 56.8;
const SKY_BACKDROP_POSITION = new THREE.Vector3(0, 27.7, -32);
const STAGE_GROUND_Y_OFFSET = -0.02;
const STAGE_EDGE_PADDING = 1.25;
const COLLISION_GRID_CELL_SIZE = 0.42;
const COLLISION_VERTEX_STRIDE = 3;
const COLLISION_MIN_HEIGHT = 0.22;
const COLLISION_MAX_HEIGHT = 1.15;
const COLLISION_CELL_RADIUS = 0.3;
const QUIZ_QUESTIONS = [
  {
    question: "¿Cuál es el nombre de la nueva fragancia Goddess?",
    options: [
      "Goddess Amber Vanilla EDP Intense",
      "Goddess Sunset Vanilla EDP Intense",
      "Goddess Amber Vanilla EDT Intense"
    ],
    correctIndex: 0,
    reminder: "El nombre correcto es Goddess Amber Vanilla EDP Intense."
  },
  {
    question: "¿De cuántas vainillas se compone Goddess Amber Vanilla?",
    options: ["3", "4", "6"],
    correctIndex: 1,
    reminder: "La fragancia se compone de 4 vainillas."
  },
  {
    question: "¿Cuáles son los ingredientes principales de Goddess Amber Vanilla?",
    options: [
      "Esencia de lavanda y miel de maple, cuarteto de extracto de vainilla, acorde ambarado",
      "Esencia de lavanda, trío de vainilla, madera de cedro",
      "Acorde de frambuesa y lavanda, cuarteto de vainilla, sándalo"
    ],
    correctIndex: 0,
    reminder:
      "La respuesta correcta es: Esencia de lavanda y miel de maple, cuarteto de extracto de vainilla, acorde ambarado."
  },
  {
    question: "¿Quién es la imagen de Burberry Goddess?",
    options: ["Emma Watson", "Emma Stone", "Emma Mackey"],
    correctIndex: 2,
    reminder: "La imagen de Burberry Goddess es Emma Mackey."
  },
  {
    question: "¿Cuál es la fragancia más intensa de la franquicia Goddess?",
    options: ["Goddess EDPI", "Goddess Parfum", "Goddess Amber Vanilla EDPI"],
    correctIndex: 1,
    reminder: "La fragancia más intensa de la franquicia es Goddess Parfum."
  },
  {
    question: "¿A qué familia olfativa pertenece Goddess Amber Vanilla?",
    options: ["Gourmand Aromático Ambarado", "Floral", "Frutal"],
    correctIndex: 0,
    reminder: "Pertenece a la familia Gourmand Aromático Ambarado."
  },
  {
    question: "¿Qué personalidad describe Goddess Amber Vanilla?",
    options: [
      "Sofisticada, Seductora, Indulgente",
      "Confianza, Fuerza, Bondad",
      "Asertividad, Poder, Bondad"
    ],
    correctIndex: 0,
    reminder: "Las características son sofisticada, seductora e indulgente."
  },
  {
    question: "¿Cuál es la diferencia visual entre Goddess Amber Vanilla y Goddess Parfum?",
    options: ["Forma del frasco", "El color del jugo", "El material del frasco"],
    correctIndex: 1,
    reminder: "La diferencia visual está en el color del jugo."
  },
  {
    question: "¿Cuál es el tipo de extracto de la cuarta vainilla?",
    options: ["Infusión de vainilla", "Caviar de vainilla", "Vainilla tostada"],
    correctIndex: 2,
    reminder: "La cuarta vainilla es vainilla tostada."
  },
  {
    question: "¿Qué describe mejor a la vainilla tostada?",
    options: ["Dulce", "Adictiva", "Todas las anteriores"],
    correctIndex: 2,
    reminder: "La vainilla tostada es dulce y adictiva."
  }
];
const SPAWN_POINTS = [
  new THREE.Vector3(-6.8, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -3.4),
  new THREE.Vector3(6.8, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -3.4),
  new THREE.Vector3(-8.2, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -8.8),
  new THREE.Vector3(8.2, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -8.8),
  new THREE.Vector3(-5.4, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -14.2),
  new THREE.Vector3(5.4, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -14.2),
  new THREE.Vector3(-2.7, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -20.4),
  new THREE.Vector3(2.7, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -20.4),
  new THREE.Vector3(0, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -6.2),
  new THREE.Vector3(0, PLATFORM_SURFACE_Y + COIN_SURFACE_OFFSET, -25)
];

const ui = {
  arShell: document.getElementById("ar-shell"),
  sceneRoot: document.getElementById("scene-root"),
  registerScreen: document.getElementById("registerScreen"),
  instructionsScreen: document.getElementById("instructionsScreen"),
  instructionsCarousel: document.getElementById("instructionsCarousel"),
  instructionsTrack: document.getElementById("instructionsTrack"),
  waitingScreen: document.getElementById("waitingScreen"),
  waitingVideo: document.getElementById("waitingVideo"),
  placementGuide: document.getElementById("placementGuide"),
  hud: document.getElementById("hud"),
  joystick: document.getElementById("joystick"),
  quizScreen: document.getElementById("quizScreen"),
  incorrectScreen: document.getElementById("incorrectScreen"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizOptions: document.getElementById("quizOptions"),
  quizFeedback: document.getElementById("quizFeedback"),
  incorrectReminder: document.getElementById("incorrectReminder"),
  debugPanel: document.getElementById("debugPanel"),
  debugText: document.getElementById("debugText"),
  end: document.getElementById("end"),
  score: document.getElementById("score"),
  time: document.getElementById("time"),
  cameraTuner: document.getElementById("cameraTuner"),
  cameraTunerToggle: document.getElementById("cameraTunerToggle"),
  cameraTunerPanel: document.getElementById("cameraTunerPanel"),
  cameraTunerControls: Array.from(document.querySelectorAll("[data-camera-field]")),
  cameraPresetButtons: Array.from(document.querySelectorAll("[data-camera-preset]")),
  endTitle: document.getElementById("endTitle"),
  endPlayerId: document.getElementById("endPlayerId"),
  endScoreValue: document.getElementById("endScoreValue"),
  endTimeValue: document.getElementById("endTimeValue"),
  status: document.getElementById("statusText"),
  configStatus: document.getElementById("configStatus"),
  retrySdkBtn: document.getElementById("retrySdkBtn"),
  registerBtn: document.getElementById("registerBtn"),
  continueBtn: document.getElementById("continueBtn"),
  startExperienceBtn: document.getElementById("startExperienceBtn"),
  restartBtn: document.getElementById("restartBtn"),
  registerError: document.getElementById("registerError"),
  firstNameInput: document.getElementById("firstNameInput"),
  lastNameInput: document.getElementById("lastNameInput"),
  base: document.getElementById("joyBase"),
  knob: document.getElementById("joyKnob")
};

const state = {
  renderer: null,
  scene: null,
  camera: null,
  cameraLookAt: SCENE_LOOK_AT.clone(),
  cameraRig: {
    position: CAMERA_POSITION.clone(),
    target: SCENE_LOOK_AT.clone(),
    frustum: CAMERA_FRUSTUM,
    followPlayer: CAMERA_FOLLOW_PLAYER
  },
  clock: new THREE.Clock(),
  loader: new GLTFLoader(),
  assetsReady: false,
  running: false,
  flowStage: "loading",
  firstName: "",
  lastName: "",
  playerName: "",
  participantEmail: "",
  attendeeCheckInAt: "",
  attendeeRecorded: false,
  attendeeRecording: false,
  sessionId: "",
  startedAt: "",
  endedAt: "",
  input: { x: 0, y: 0 },
  playerPos: new THREE.Vector3(0, 0, 0),
  movementHalfX: BOARD_HALF_X,
  movementHalfZ: BOARD_HALF_Z,
  playerYaw: 0,
  score: 0,
  collectedCount: 0,
  time: 0,
  timer: null,
  quizActive: false,
  quizTriggeredAtScore: null,
  currentQuestion: null,
  currentRoundNumber: 0,
  currentRoundStartedAt: 0,
  quizOrder: [],
  quizIndex: 0,
  erroresTotal: 0,
  rachaActual: 0,
  rachaMaxima: 0,
  tiempoPrimerAcierto: null,
  tiempoPrimerError: null,
  rondasData: [],
  errorLog: [],
  correctLog: [],
  sessionSaved: false,
  sessionSaving: false,
  instructionsIndex: 0,
  instructionsUnlocked: false,
  lionessRoot: null,
  lionessScene: null,
  lionessMixer: null,
  lionessAction: null,
  platformRoot: null,
  landscapeRoot: null,
  skyBackdrop: null,
  stageGroundRoot: null,
  stageLimits: null,
  surfaceY: PLATFORM_SURFACE_Y,
  collisionGrid: null,
  envMap: null,
  coinTemplate: null,
  coins: [],
  coinRespawnQueue: [],
  statusMessage: "Preparando escena 3D..."
};

const cameraGroundForward = new THREE.Vector3();
const cameraGroundRight = new THREE.Vector3();
const movementVector = new THREE.Vector3();
const targetLookQuaternion = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);
const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();
const tempCollisionVector = new THREE.Vector3();

setupScene();
setupUI();
setupInstructionsCarousel();
setupJoystick();
updateAppHeight();
setupDatahubRetry();
window.addEventListener("resize", handleResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleResize);
}
state.loader.setMeshoptDecoder(MeshoptDecoder);
void loadAssets();
animate();

function setupScene() {
  state.scene = new THREE.Scene();

  state.camera = new THREE.OrthographicCamera();
  updateCameraFollow(true);

  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFShadowMap;
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 0.96;
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.renderer.setClearColor(0x000000, 0);
  state.renderer.domElement.className = "scene-canvas";
  ui.sceneRoot.appendChild(state.renderer.domElement);

  const ambient = new THREE.AmbientLight(0xfff0df, 0.52);
  const hemisphere = new THREE.HemisphereLight(0xfff2df, 0x7f694d, 0.68);
  const sun = new THREE.DirectionalLight(0xffe1ad, 3.25);
  sun.position.set(7, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.bias = -0.00008;

  const rim = new THREE.DirectionalLight(0xb8d8ff, 0.22);
  rim.position.set(-8, 8, -10);

  state.scene.add(ambient, hemisphere, sun, rim);
  state.stageGroundRoot = createStageGroundRoot();
  state.scene.add(state.stageGroundRoot);
  state.platformRoot = createPlatform();
  state.scene.add(state.platformRoot);

  handleResize();
}

function updateCameraFollow(immediate = false, delta = 0) {
  if (!state.camera) return;
  const rig = state.cameraRig;
  const targetX = rig.followPlayer ? state.playerPos.x + rig.target.x : rig.target.x;
  const targetZ = rig.followPlayer ? state.playerPos.z + rig.target.z : rig.target.z;
  const desiredLookAt = new THREE.Vector3(
    targetX,
    rig.target.y,
    targetZ
  );
  const desiredCameraPosition = rig.followPlayer
    ? desiredLookAt.clone().add(rig.position.clone().sub(rig.target))
    : rig.position.clone();

  if (immediate) {
    state.cameraLookAt.copy(desiredLookAt);
    state.camera.position.copy(desiredCameraPosition);
  } else {
    const t = 1 - Math.exp(-CAMERA_FOLLOW_LERP * delta);
    state.cameraLookAt.lerp(desiredLookAt, t);
    state.camera.position.lerp(desiredCameraPosition, t);
  }

  state.camera.lookAt(state.cameraLookAt);
  state.camera.updateMatrixWorld();
  updateSkyBackdropPosition();
}

function updateSkyBackdropPosition() {
  if (!state.skyBackdrop) return;
  state.skyBackdrop.position.set(
    state.cameraLookAt.x + SKY_BACKDROP_POSITION.x,
    SKY_BACKDROP_POSITION.y,
    state.cameraLookAt.z + SKY_BACKDROP_POSITION.z
  );
}

function createPlatform() {
  const group = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(16, 4.4, 16),
    new THREE.MeshStandardMaterial({
      color: 0xc8b3a5,
      roughness: 0.95,
      metalness: 0.01
    })
  );
  pedestal.position.y = -2.4;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const shape = new THREE.Shape();
  shape.moveTo(-6.7, -5.4);
  shape.bezierCurveTo(-7.8, -3.8, -7.9, 3.2, -6.1, 5.1);
  shape.bezierCurveTo(-3.8, 7.4, 1.2, 7.7, 5.8, 6.4);
  shape.bezierCurveTo(8.1, 5.7, 8.6, 2.6, 7.9, -2.4);
  shape.bezierCurveTo(7.1, -6.8, 1.4, -7.6, -2.8, -7.1);
  shape.bezierCurveTo(-4.7, -6.9, -6.1, -6.4, -6.7, -5.4);

  const top = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 1.15,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.42,
      bevelThickness: 0.26,
      curveSegments: 20
    }),
    new THREE.MeshStandardMaterial({
      color: 0xd8ad78,
      roughness: 0.74,
      metalness: 0.08
    })
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.06;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const emblem = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.14, 18, 64),
    new THREE.MeshStandardMaterial({
      color: 0xb47d39,
      roughness: 0.42,
      metalness: 0.7
    })
  );
  emblem.rotation.x = -Math.PI / 2;
  emblem.position.set(0, 1.24, 0.3);
  emblem.castShadow = true;
  emblem.receiveShadow = true;
  group.add(emblem);

  const emblemCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 48),
    new THREE.MeshStandardMaterial({
      color: 0xe5c58d,
      roughness: 0.5,
      metalness: 0.35
    })
  );
  emblemCore.rotation.x = -Math.PI / 2;
  emblemCore.position.set(0, 1.245, 0.3);
  group.add(emblemCore);

  const underShadow = new THREE.Mesh(
    new THREE.CircleGeometry(11, 48),
    new THREE.MeshBasicMaterial({
      color: 0xb57b60,
      transparent: true,
      opacity: 0.18
    })
  );
  underShadow.rotation.x = -Math.PI / 2;
  underShadow.position.y = -4.58;
  group.add(underShadow);

  group.scale.set(1.28, 1, 1.28);

  return group;
}

function createStageGroundRoot() {
  const group = new THREE.Group();
  group.name = "StageGroundRoot";
  group.visible = false;
  return group;
}

function getSurfaceY() {
  return state.surfaceY ?? PLATFORM_SURFACE_Y;
}

function getPlayerY() {
  return getSurfaceY() + LIONESS_SURFACE_OFFSET;
}

function getCoinY() {
  return getSurfaceY() + COIN_SURFACE_OFFSET;
}

function configureStageGroundTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.center.set(0.5, 0.5);
  texture.rotation = 0;
  texture.anisotropy = state.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  texture.needsUpdate = true;
  return texture;
}

function setStageGroundFromLandscape(bounds, texture) {
  if (!state.stageGroundRoot || bounds.isEmpty() || !texture) return null;

  state.stageGroundRoot.clear();

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const groundSize = Math.max(size.x, size.z);
  const groundY = getPlayerY() + STAGE_GROUND_Y_OFFSET;
  const halfGround = groundSize / 2;
  state.stageLimits = {
    minX: center.x - halfGround + STAGE_EDGE_PADDING,
    maxX: center.x + halfGround - STAGE_EDGE_PADDING,
    minZ: center.z - halfGround + STAGE_EDGE_PADDING,
    maxZ: center.z + halfGround - STAGE_EDGE_PADDING
  };
  state.movementHalfX = halfGround - STAGE_EDGE_PADDING;
  state.movementHalfZ = halfGround - STAGE_EDGE_PADDING;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize, 64, 64),
    new THREE.MeshStandardMaterial({
      map: configureStageGroundTexture(texture),
      color: 0xf4c992,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  ground.name = "BurberryStageGround";
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, groundY, center.z);
  ground.receiveShadow = true;
  ground.renderOrder = -1;

  state.stageGroundRoot.add(ground);
  state.stageGroundRoot.visible = true;
  return { center, groundSize, groundY };
}

function setStageLimitsFromBounds(bounds) {
  if (!bounds || bounds.isEmpty()) return;

  state.stageLimits = {
    minX: bounds.min.x + STAGE_EDGE_PADDING,
    maxX: bounds.max.x - STAGE_EDGE_PADDING,
    minZ: bounds.min.z + STAGE_EDGE_PADDING,
    maxZ: bounds.max.z - STAGE_EDGE_PADDING
  };
  state.movementHalfX = Math.max(
    BOARD_HALF_X,
    Math.min(Math.abs(state.stageLimits.minX), Math.abs(state.stageLimits.maxX))
  );
  state.movementHalfZ = Math.max(
    BOARD_HALF_Z,
    Math.min(Math.abs(state.stageLimits.minZ), Math.abs(state.stageLimits.maxZ))
  );
}

async function loadAssets() {
  try {
    const [lionessGltf, coinGltf, landscapeResult, hdriTexture, skyTexture] = await Promise.all([
      loadGltf(LIONESS_URL),
      loadGltf(COIN_URL),
      loadGltf(LANDSCAPE_URL).catch((error) => {
        console.warn("No se pudo cargar el landscape optimizado.", error);
        return null;
      }),
      loadExr(HDRI_URL).catch((error) => {
        console.warn("No se pudo cargar el HDRI.", error);
        return null;
      }),
      loadTexture(SKY_BACKDROP_URL).catch((error) => {
        console.warn("No se pudo cargar el cielo.", error);
        return null;
      })
    ]);
    if (hdriTexture) {
      applyEnvironmentMap(hdriTexture);
    }
    if (skyTexture) {
      createSkyBackdrop(skyTexture);
    }
    prepareLioness(lionessGltf);
    prepareCoinTemplate(coinGltf);
    if (landscapeResult) {
      prepareLandscape(landscapeResult);
    }
    createCoins();
    state.assetsReady = true;
    state.statusMessage = "Escena lista";
    setStartButtonEnabled(true);
  } catch (error) {
    console.error(error);
    state.statusMessage = "No se pudieron cargar los assets 3D.";
    if (ui.configStatus) {
      ui.configStatus.textContent = "No se pudieron cargar los assets 3D. Recarga la página.";
      ui.configStatus.classList.remove("hidden");
    }
  }
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    state.loader.load(url, resolve, undefined, reject);
  });
}

function loadExr(url) {
  return new Promise((resolve, reject) => {
    new EXRLoader().load(url, resolve, undefined, reject);
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

function applyEnvironmentMap(texture) {
  if (!state.renderer || !state.scene) return;
  const pmremGenerator = new THREE.PMREMGenerator(state.renderer);
  pmremGenerator.compileEquirectangularShader();
  state.envMap?.dispose?.();
  state.envMap = pmremGenerator.fromEquirectangular(texture).texture;
  state.scene.environment = state.envMap;
  state.scene.environmentIntensity = 0.34;
  texture.dispose();
  pmremGenerator.dispose();
}

function createSkyBackdrop(texture) {
  if (!state.scene) return;

  const imageAspect = texture.image?.width && texture.image?.height
    ? texture.image.width / texture.image.height
    : 9 / 16;
  const backdropWidth = SKY_BACKDROP_HEIGHT * imageAspect;

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = state.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  texture.needsUpdate = true;

  state.skyBackdrop?.geometry?.dispose?.();
  state.skyBackdrop?.material?.map?.dispose?.();
  state.skyBackdrop?.material?.dispose?.();
  state.skyBackdrop?.parent?.remove(state.skyBackdrop);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(backdropWidth, SKY_BACKDROP_HEIGHT),
    new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false
    })
  );
  backdrop.name = "SkyBackdrop";
  backdrop.position.copy(SKY_BACKDROP_POSITION);
  backdrop.renderOrder = -20;
  state.skyBackdrop = backdrop;
  state.scene.add(backdrop);
}

function prepareLioness(gltf) {
  state.lionessRoot = new THREE.Group();
  state.lionessScene = gltf.scene;
  state.lionessScene.scale.setScalar(LIONESS_SCALE);
  tempBox.setFromObject(state.lionessScene);
  tempBox.getCenter(tempVector);
  state.lionessScene.position.sub(tempVector);
  tempBox.setFromObject(state.lionessScene);
  state.lionessScene.position.y -= tempBox.min.y;
  state.lionessScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  state.lionessRoot.add(state.lionessScene);
  state.lionessRoot.position.set(0, getPlayerY(), 0);
  state.scene.add(state.lionessRoot);

  if (gltf.animations?.length) {
    state.lionessMixer = new THREE.AnimationMixer(state.lionessScene);
    state.lionessAction = state.lionessMixer.clipAction(gltf.animations[0]);
    state.lionessAction.play();
    state.lionessAction.paused = true;
  }
}

function prepareLandscape(gltf) {
  state.landscapeRoot = gltf.scene;

  const removableNodes = [];
  state.landscapeRoot.traverse((child) => {
    if (!child?.name) return;
    const name = child.name.toLowerCase();
    const position = child.position;
    const isFarAway =
      position &&
      (Math.abs(position.x) > 300 || Math.abs(position.z) > 300);
    const isOverlayPlane = name === "plane.002";

    if (name.includes("lion") || isFarAway || isOverlayPlane) {
      removableNodes.push(child);
    }
  });
  removableNodes.forEach((node) => {
    node.parent?.remove(node);
  });

  state.landscapeRoot.rotation.y = LANDSCAPE_ROTATION_Y;
  tempBox.setFromObject(state.landscapeRoot);
  tempBox.getCenter(tempVector);
  state.landscapeRoot.position.sub(tempVector);

  tempBox.setFromObject(state.landscapeRoot);
  const size = tempBox.getSize(new THREE.Vector3());
  const maxHorizontalSize = Math.max(size.x, size.z) || 1;
  const scaleFactor = LANDSCAPE_TARGET_SIZE / maxHorizontalSize;
  state.landscapeRoot.scale.setScalar(scaleFactor);

  tempBox.setFromObject(state.landscapeRoot);
  tempBox.getCenter(tempVector);
  state.landscapeRoot.position.x -= tempVector.x;
  state.landscapeRoot.position.z -= tempVector.z;
  state.landscapeRoot.position.y += PLATFORM_SURFACE_Y - tempBox.min.y;
  tempBox.setFromObject(state.landscapeRoot);

  state.surfaceY = detectLandscapeSurfaceY();
  setStageLimitsFromBounds(tempBox);

  state.landscapeRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.receiveShadow = true;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => fixLandscapeMaterial(material));
    } else {
      child.material = fixLandscapeMaterial(child.material);
    }
    const firstMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    child.castShadow = shouldLandscapeCastShadow(
      child,
      firstMaterial?.name || "",
      firstMaterial?.map?.name || ""
    );
  });

  if (state.platformRoot) {
    state.platformRoot.visible = false;
  }

  if (state.stageGroundRoot) {
    state.stageGroundRoot.clear();
    state.stageGroundRoot.visible = false;
  }

  if (state.lionessRoot) {
    state.lionessRoot.position.y = getPlayerY();
  }

  buildScenarioCollisionGrid(tempBox, getSurfaceY());
  state.scene.add(state.landscapeRoot);
}

function detectLandscapeSurfaceY() {
  if (!state.landscapeRoot) return PLATFORM_SURFACE_Y;

  let bestSurface = null;
  const meshBox = new THREE.Box3();
  const meshSize = new THREE.Vector3();
  state.landscapeRoot.updateMatrixWorld(true);

  state.landscapeRoot.traverse((child) => {
    if (!child.isMesh) return;

    meshBox.setFromObject(child);
    if (meshBox.isEmpty()) return;
    meshBox.getSize(meshSize);
    if (meshSize.x < 4 || meshSize.z < 4 || meshSize.y > 0.45) return;

    const name = child.name?.toLowerCase?.() || "";
    const preferredSurface =
      name.includes("plane004") ||
      name.includes("whatsapp_image") ||
      name === "plane";
    const area = meshSize.x * meshSize.z;
    const score = area + (preferredSurface ? 1000 : 0) - meshSize.y * 100;

    if (!bestSurface || score > bestSurface.score) {
      bestSurface = {
        score,
        y: meshBox.max.y
      };
    }
  });

  return bestSurface?.y ?? PLATFORM_SURFACE_Y;
}

function buildScenarioCollisionGrid(bounds, groundY) {
  if (!state.landscapeRoot || bounds.isEmpty()) return;

  const minX = bounds.min.x - STAGE_EDGE_PADDING;
  const maxX = bounds.max.x + STAGE_EDGE_PADDING;
  const minZ = bounds.min.z - STAGE_EDGE_PADDING;
  const maxZ = bounds.max.z + STAGE_EDGE_PADDING;
  const cols = Math.max(1, Math.ceil((maxX - minX) / COLLISION_GRID_CELL_SIZE));
  const rows = Math.max(1, Math.ceil((maxZ - minZ) / COLLISION_GRID_CELL_SIZE));
  const blocked = new Uint8Array(cols * rows);
  const minHeight = groundY + COLLISION_MIN_HEIGHT;
  const maxHeight = groundY + COLLISION_MAX_HEIGHT;

  const markCell = (x, z) => {
    const col = Math.floor((x - minX) / COLLISION_GRID_CELL_SIZE);
    const row = Math.floor((z - minZ) / COLLISION_GRID_CELL_SIZE);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    blocked[row * cols + col] = 1;
  };

  state.landscapeRoot.updateMatrixWorld(true);
  state.landscapeRoot.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    const position = child.geometry.attributes.position;

    for (let index = 0; index < position.count; index += COLLISION_VERTEX_STRIDE) {
      tempCollisionVector.fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld);
      if (tempCollisionVector.y < minHeight || tempCollisionVector.y > maxHeight) continue;
      markCell(tempCollisionVector.x, tempCollisionVector.z);
    }
  });

  state.collisionGrid = {
    minX,
    minZ,
    cols,
    rows,
    cellSize: COLLISION_GRID_CELL_SIZE,
    blocked
  };
}

function prepareCoinTemplate(gltf) {
  state.coinTemplate = gltf.scene;
  state.coinTemplate.scale.setScalar(COIN_SCALE);
  tempBox.setFromObject(state.coinTemplate);
  tempBox.getCenter(tempVector);
  state.coinTemplate.position.sub(tempVector);
  tempBox.setFromObject(state.coinTemplate);
  state.coinTemplate.position.y -= tempBox.min.y;
  state.coinTemplate.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
      child.material = child.material.clone();
      child.material.side = THREE.DoubleSide;
      if ("metalness" in child.material) child.material.metalness = 0.85;
      if ("roughness" in child.material) child.material.roughness = 0.28;
      if ("emissive" in child.material) child.material.emissive.set(0x6a3a00);
      if ("emissiveIntensity" in child.material) child.material.emissiveIntensity = 0.35;
    }
  });
}

function createCoins() {
  state.coins = Array.from({ length: 6 }, (_, index) => {
    const object = state.coinTemplate.clone(true);
    object.visible = false;
    state.scene.add(object);
    return {
      id: index,
      object,
      active: false,
      respawnAt: 0,
      spawnIndex: -1,
      baseY: getCoinY(),
      spinOffset: Math.random() * Math.PI * 2
    };
  });
}

function setupUI() {
  ui.retrySdkBtn?.classList.add("hidden");
  ui.configStatus?.classList.add("hidden");
  ui.debugPanel?.classList.add("hidden");
  ui.placementGuide?.classList.add("hidden");
  setupCameraTuner();
  if (ui.status) {
    ui.status.textContent = "Mueve la leona por el mapa.";
  }
  if (ui.continueBtn) {
    setContinueButtonEnabled(false);
  }
  setStartButtonEnabled(false);
  activateButton(ui.registerBtn, handleRegister);
  activateButton(ui.continueBtn, () => {
    state.flowStage = "waiting";
    showScreen(ui.waitingScreen);
    playWaitingVideo();
  });
  activateButton(ui.startExperienceBtn, () => {
    startGame();
  });
  activateButton(ui.restartBtn, restartExperience);
  state.flowStage = "register";
  showScreen(ui.registerScreen);
}

function setupCameraTuner() {
  if (!ENABLE_CAMERA_TUNER) {
    ui.cameraTuner?.classList.add("hidden");
    ui.cameraTunerPanel?.classList.add("hidden");
    return;
  }
  if (!ui.cameraTuner || !ui.cameraTunerToggle) return;

  ui.cameraTunerToggle.addEventListener("click", () => {
    ui.cameraTunerPanel?.classList.toggle("hidden");
  });

  ui.cameraTunerControls.forEach((control) => {
    control.addEventListener("input", () => {
      setCameraRigValue(control.dataset.cameraField, Number(control.value));
      syncCameraTunerControls();
    });
  });

  ui.cameraPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyCameraPreset(button.dataset.cameraPreset);
    });
  });

  syncCameraTunerControls();
}

function applyCameraPreset(presetName = "mid") {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  state.cameraRig.position.copy(preset.position);
  state.cameraRig.target.copy(preset.target);
  state.cameraRig.frustum = preset.frustum;
  updateCameraProjection();
  updateCameraFollow(true);
  syncCameraTunerControls();
}

function setCameraRigValue(field, value) {
  if (!field || !Number.isFinite(value)) return;

  if (field === "frustum") {
    state.cameraRig.frustum = value;
    updateCameraProjection();
    updateCameraFollow(true);
    return;
  }

  const [group, axis] = field.split(".");
  if (!["position", "target"].includes(group)) return;
  if (!["x", "y", "z"].includes(axis)) return;
  state.cameraRig[group][axis] = value;
  updateCameraFollow(true);
}

function getCameraRigValue(field) {
  if (field === "frustum") return state.cameraRig.frustum;
  const [group, axis] = field.split(".");
  return state.cameraRig[group]?.[axis] ?? 0;
}

function syncCameraTunerControls() {
  ui.cameraTunerControls.forEach((control) => {
    const value = getCameraRigValue(control.dataset.cameraField);
    control.value = String(value);
    const output = control.parentElement?.querySelector("output");
    if (output) {
      output.textContent = value.toFixed(1);
    }
  });

  ui.cameraPresetButtons.forEach((button) => {
    const preset = CAMERA_PRESETS[button.dataset.cameraPreset];
    const active =
      preset &&
      preset.frustum === state.cameraRig.frustum &&
      preset.position.distanceToSquared(state.cameraRig.position) < 0.001 &&
      preset.target.distanceToSquared(state.cameraRig.target) < 0.001;
    button.classList.toggle("is-active", Boolean(active));
  });
}

function setupInstructionsCarousel() {
  if (!ui.instructionsCarousel || !ui.instructionsTrack) return;

  let startX = 0;
  let deltaX = 0;
  let dragging = false;
  const maxIndex = ui.instructionsTrack.children.length - 1;

  const updateTrack = () => {
    ui.instructionsTrack.style.transform = `translateX(-${state.instructionsIndex * 100}%)`;
  };

  const maybeUnlock = () => {
    if (state.instructionsIndex >= maxIndex) {
      state.instructionsUnlocked = true;
      setContinueButtonEnabled(true);
    }
  };

  const onPointerDown = (event) => {
    dragging = true;
    startX = event.clientX;
    deltaX = 0;
    ui.instructionsCarousel.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    deltaX = event.clientX - startX;
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0 && state.instructionsIndex < maxIndex) {
        state.instructionsIndex += 1;
      } else if (deltaX > 0 && state.instructionsIndex > 0) {
        state.instructionsIndex -= 1;
      }
    }
    updateTrack();
    maybeUnlock();
  };

  ui.instructionsCarousel.addEventListener("pointerdown", onPointerDown);
  ui.instructionsCarousel.addEventListener("pointermove", onPointerMove);
  ui.instructionsCarousel.addEventListener("pointerup", onPointerUp);
  ui.instructionsCarousel.addEventListener("pointercancel", onPointerUp);
  ui.instructionsCarousel.addEventListener("lostpointercapture", onPointerUp);
  updateTrack();
}

function setupJoystick() {
  const base = ui.base;
  const knob = ui.knob;
  if (!base || !knob) return;

  const radius = 42;
  let pointerId = null;

  const setInput = (clientX, clientY) => {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > radius) {
      const factor = radius / distance;
      deltaX *= factor;
      deltaY *= factor;
    }
    knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    state.input.x = deltaX / radius;
    state.input.y = -deltaY / radius;
  };

  const resetInput = () => {
    pointerId = null;
    state.input.x = 0;
    state.input.y = 0;
    knob.style.transform = "translate(-50%, -50%)";
  };

  base.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    base.setPointerCapture(pointerId);
    setInput(event.clientX, event.clientY);
  });

  base.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    setInput(event.clientX, event.clientY);
  });

  const release = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    resetInput();
  };

  base.addEventListener("pointerup", release);
  base.addEventListener("pointercancel", release);
  base.addEventListener("lostpointercapture", resetInput);
}

function handleRegister() {
  const firstName = ui.firstNameInput?.value.trim() || "";
  const lastName = ui.lastNameInput?.value.trim() || "";
  if (!firstName || !lastName) {
    ui.registerError?.classList.remove("hidden");
    return;
  }
  state.firstName = firstName;
  state.lastName = lastName;
  state.playerName = `${firstName} ${lastName}`;
  const identity = createParticipantIdentity({ firstName, lastName });
  state.participantEmail = identity.email;
  state.attendeeCheckInAt = new Date().toISOString();
  state.attendeeRecorded = false;
  void registrarAsistenteActual();
  ui.registerError?.classList.add("hidden");
  resetInstructionsFlow();
  state.flowStage = "instructions";
  showScreen(ui.instructionsScreen);
}

function startGame() {
  if (!state.assetsReady) return;
  stopRoundLoop();
  state.flowStage = "game";
  state.running = true;
  state.quizActive = false;
  state.quizTriggeredAtScore = null;
  state.currentQuestion = null;
  state.quizOrder = shuffleIndices(QUIZ_QUESTIONS.length);
  state.quizIndex = 0;
  const session = createSessionMetadata();
  state.sessionId = session.sessionId;
  state.startedAt = session.startedAt;
  state.endedAt = "";
  state.playerPos.set(0, 0, 0);
  state.playerYaw = getCurrentPlayerQuaternionYaw();
  state.score = 0;
  state.collectedCount = 0;
  state.time = 0;
  state.sessionSaved = false;
  state.input = { x: 0, y: 0 };
  resetSessionMetrics();
  ui.knob.style.transform = "translate(-50%, -50%)";
  ui.score.textContent = "0";
  ui.time.textContent = "0";
  ui.quizFeedback.textContent = "";
  ui.quizFeedback.classList.add("hidden");
  ui.quizOptions.innerHTML = "";
  ui.quizScreen.classList.add("hidden");
  ui.incorrectScreen.classList.add("hidden");
  hideAllScreens();
  ui.hud.classList.remove("hidden");
  ui.joystick.classList.remove("hidden");
  if (ENABLE_CAMERA_TUNER) {
    ui.cameraTuner?.classList.remove("hidden");
  }
  if (state.lionessRoot) {
    state.lionessRoot.position.set(0, getPlayerY(), 0);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(upAxis, 0);
    state.lionessRoot.quaternion.copy(quaternion);
  }
  updateCameraFollow(true);
  spawnInitialCoins();
  state.timer = window.setInterval(() => {
    if (!state.running) return;
    state.time += 1;
    ui.time.textContent = String(state.time);
  }, 1000);
}

function restartExperience() {
  stopRoundLoop();
  resetCoins();
  state.flowStage = "register";
  state.firstName = "";
  state.lastName = "";
  state.playerName = "";
  state.participantEmail = "";
  state.attendeeCheckInAt = "";
  state.attendeeRecorded = false;
  state.attendeeRecording = false;
  state.sessionId = "";
  state.startedAt = "";
  state.endedAt = "";
  ui.firstNameInput.value = "";
  ui.lastNameInput.value = "";
  ui.registerError?.classList.add("hidden");
  resetInstructionsFlow();
  ui.quizScreen.classList.add("hidden");
  ui.incorrectScreen.classList.add("hidden");
  ui.hud.classList.add("hidden");
  ui.joystick.classList.add("hidden");
  ui.cameraTuner?.classList.add("hidden");
  ui.cameraTunerPanel?.classList.add("hidden");
  showScreen(ui.registerScreen);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = state.clock.getDelta();
  if (state.lionessMixer) {
    state.lionessMixer.update(delta);
  }
  updateCoins(delta);
  if (state.running) {
    updateMovement(delta);
    checkCollisions();
  } else if (state.lionessAction) {
    state.lionessAction.paused = true;
  }
  updateCameraFollow(false, delta);
  state.renderer.render(state.scene, state.camera);
}

function updateMovement(delta) {
  if (!state.lionessRoot) return;

  cameraGroundForward.copy(state.cameraLookAt).sub(state.camera.position).setY(0).normalize();
  cameraGroundRight.crossVectors(cameraGroundForward, upAxis).normalize();
  movementVector
    .copy(cameraGroundRight)
    .multiplyScalar(state.input.x)
    .addScaledVector(cameraGroundForward, state.input.y);

  const moving = movementVector.lengthSq() > 0.001;
  if (!moving) {
    if (state.lionessAction) {
      state.lionessAction.paused = true;
    }
    return;
  }

  movementVector.normalize().multiplyScalar(PLAYER_SPEED * delta);
  movePlayerWithCollisions(movementVector);
  state.lionessRoot.position.set(
    state.playerPos.x,
    getPlayerY(),
    state.playerPos.z
  );

  const moveAngle = Math.atan2(movementVector.x, movementVector.z);
  state.playerYaw = moveAngle + MODEL_FORWARD_YAW_OFFSET;
  targetLookQuaternion.setFromAxisAngle(upAxis, state.playerYaw);
  state.lionessRoot.quaternion.slerp(targetLookQuaternion, Math.min(1, PLAYER_ROTATE_SPEED * delta));

  if (state.lionessAction) {
    state.lionessAction.paused = false;
    state.lionessAction.setEffectiveTimeScale(1);
  }
}

function movePlayerWithCollisions(deltaMove) {
  const next = state.playerPos.clone();

  if (deltaMove.x !== 0) {
    next.x += deltaMove.x;
    constrainPlayerPosition(next, PLAYER_COLLISION_RADIUS);
  }

  if (deltaMove.z !== 0) {
    next.z += deltaMove.z;
    constrainPlayerPosition(next, PLAYER_COLLISION_RADIUS);
  }

  state.playerPos.copy(next);
}

function constrainPlayerPosition(position, radius = PLAYER_COLLISION_RADIUS) {
  constrainToStageEdges(position, radius);
  resolveScenarioCollisions(position, radius);
  constrainToStageEdges(position, radius);
  return position;
}

function constrainToStageEdges(position, radius) {
  if (state.stageLimits) {
    position.x = THREE.MathUtils.clamp(
      position.x,
      state.stageLimits.minX + radius,
      state.stageLimits.maxX - radius
    );
    position.z = THREE.MathUtils.clamp(
      position.z,
      state.stageLimits.minZ + radius,
      state.stageLimits.maxZ - radius
    );
    return;
  }

  position.x = THREE.MathUtils.clamp(position.x, -state.movementHalfX, state.movementHalfX);
  position.z = THREE.MathUtils.clamp(position.z, -state.movementHalfZ, state.movementHalfZ);
}

function resolveScenarioCollisions(position, radius) {
  const grid = state.collisionGrid;
  if (!grid) return false;

  let collided = false;

  for (let pass = 0; pass < 3; pass += 1) {
    const searchRadius = radius + grid.cellSize * 1.5;
    const minCol = Math.max(0, Math.floor((position.x - searchRadius - grid.minX) / grid.cellSize));
    const maxCol = Math.min(
      grid.cols - 1,
      Math.floor((position.x + searchRadius - grid.minX) / grid.cellSize)
    );
    const minRow = Math.max(0, Math.floor((position.z - searchRadius - grid.minZ) / grid.cellSize));
    const maxRow = Math.min(
      grid.rows - 1,
      Math.floor((position.z + searchRadius - grid.minZ) / grid.cellSize)
    );
    let correctionX = 0;
    let correctionZ = 0;
    let hitCount = 0;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (!grid.blocked[row * grid.cols + col]) continue;

        const cellX = grid.minX + (col + 0.5) * grid.cellSize;
        const cellZ = grid.minZ + (row + 0.5) * grid.cellSize;
        const dx = position.x - cellX;
        const dz = position.z - cellZ;
        const distance = Math.hypot(dx, dz);
        const minDistance = radius + COLLISION_CELL_RADIUS;
        if (distance >= minDistance) continue;

        const safeDistance = Math.max(distance, 0.0001);
        const push = minDistance - safeDistance;
        const normalX = distance < 0.0001 ? 1 : dx / safeDistance;
        const normalZ = distance < 0.0001 ? 0 : dz / safeDistance;
        correctionX += normalX * push;
        correctionZ += normalZ * push;
        hitCount += 1;
      }
    }

    if (!hitCount) break;
    position.x += correctionX / hitCount;
    position.z += correctionZ / hitCount;
    collided = true;
  }

  return collided;
}

function isPositionWalkable(x, z, radius = PLAYER_COLLISION_RADIUS) {
  if (state.stageLimits) {
    if (
      x < state.stageLimits.minX + radius ||
      x > state.stageLimits.maxX - radius ||
      z < state.stageLimits.minZ + radius ||
      z > state.stageLimits.maxZ - radius
    ) {
      return false;
    }
  }

  const testPosition = new THREE.Vector3(x, 0, z);
  const moved = resolveScenarioCollisions(testPosition, radius);
  if (!moved) return true;
  return Math.hypot(testPosition.x - x, testPosition.z - z) < 0.05;
}

function updateCoins(delta) {
  const now = performance.now();
  for (const coin of state.coins) {
    if (coin.active) {
      coin.object.rotation.y += delta * 1.8;
      coin.object.position.y = coin.baseY + Math.sin(now * 0.003 + coin.spinOffset) * 0.18;
      continue;
    }
    if (coin.respawnAt && now >= coin.respawnAt) {
      respawnCoin(coin);
    }
  }
}

function spawnInitialCoins() {
  resetCoins();
  state.coins.forEach((coin) => {
    respawnCoin(coin);
  });
}

function resetCoins() {
  state.coins.forEach((coin) => {
    coin.active = false;
    coin.respawnAt = 0;
    coin.spawnIndex = -1;
    coin.object.visible = false;
  });
}

function respawnCoin(coin) {
  const spawnIndex = chooseFreeSpawnIndex(coin.id);
  if (spawnIndex === -1) return;
  const spawn = SPAWN_POINTS[spawnIndex];
  coin.active = true;
  coin.respawnAt = 0;
  coin.spawnIndex = spawnIndex;
  coin.object.visible = true;
  coin.object.position.set(spawn.x, getCoinY(), spawn.z);
  coin.object.rotation.set(0, Math.random() * Math.PI * 2, 0);
  coin.baseY = getCoinY();
}

function chooseFreeSpawnIndex(coinId) {
  const occupied = new Set(
    state.coins
      .filter((coin) => coin.active && coin.id !== coinId && coin.spawnIndex >= 0)
      .map((coin) => coin.spawnIndex)
  );
  const available = SPAWN_POINTS
    .map((_, index) => index)
    .filter((index) => {
      if (occupied.has(index)) return false;
      const point = SPAWN_POINTS[index];
      return isPositionWalkable(point.x, point.z, COIN_COLLISION_RADIUS);
    });
  if (!available.length) return -1;
  return available[Math.floor(Math.random() * available.length)];
}

function checkCollisions() {
  for (const coin of state.coins) {
    if (!coin.active) continue;
    const dx = coin.object.position.x - state.playerPos.x;
    const dz = coin.object.position.z - state.playerPos.z;
    const distance = Math.hypot(dx, dz);
    if (distance > PLAYER_COLLISION_RADIUS + COIN_COLLISION_RADIUS) continue;

    coin.active = false;
    coin.object.visible = false;
    coin.respawnAt = performance.now() + COIN_RESPAWN_DELAY_MS;
    coin.spawnIndex = -1;
    state.score += 1;
    state.collectedCount += 1;
    ui.score.textContent = String(state.collectedCount);
    maybeTriggerQuiz();
  }
}

function maybeTriggerQuiz() {
  if (state.quizActive) return;
  if (state.collectedCount === 0) return;
  if (state.collectedCount % QUIZ_TRIGGER_SCORE !== 0) return;
  if (state.quizTriggeredAtScore === state.collectedCount) return;

  state.quizTriggeredAtScore = state.collectedCount;
  state.quizActive = true;
  state.running = false;
  state.input.x = 0;
  state.input.y = 0;
  ui.knob.style.transform = "translate(-50%, -50%)";
  showQuiz();
}

function showQuiz() {
  if (state.quizIndex >= QUIZ_QUESTIONS.length) {
    endRound();
    return;
  }

  const questionIndex = state.quizOrder[state.quizIndex];
  state.quizIndex += 1;
  const question = QUIZ_QUESTIONS[questionIndex];
  state.currentQuestion = question;
  state.currentRoundNumber = state.quizIndex;
  state.currentRoundStartedAt = state.time;
  ui.quizQuestion.textContent = question.question;
  ui.quizOptions.innerHTML = "";
  ui.quizFeedback.textContent = "";
  ui.quizFeedback.classList.add("hidden");
  ui.quizOptions.classList.remove("hidden");

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option-btn";
    button.textContent = option;
    activateButton(button, () => answerQuiz(index, button));
    ui.quizOptions.appendChild(button);
  });

  ui.quizScreen.classList.remove("hidden");
  ui.hud.classList.remove("hidden");
  ui.joystick.classList.add("hidden");
  ui.cameraTuner?.classList.add("hidden");
  ui.cameraTunerPanel?.classList.add("hidden");
}

function answerQuiz(index, clickedButton) {
  const question = state.currentQuestion;
  if (!question || !state.quizActive) return;
  const selectedOption = question.options[index] || "";

  const optionButtons = Array.from(ui.quizOptions.querySelectorAll(".quiz-option-btn"));
  optionButtons.forEach((button) => {
    button.disabled = true;
  });

  const correct = index === question.correctIndex;
  clickedButton.classList.add(correct ? "correct" : "wrong");
  if (!correct && optionButtons[question.correctIndex]) {
    optionButtons[question.correctIndex].classList.add("correct");
  }

  if (correct) {
    registrarRespuestaCorrecta(question, selectedOption);
    ui.quizFeedback.textContent = "";
    ui.quizFeedback.classList.add("hidden");
    window.setTimeout(() => {
      ui.quizScreen.classList.add("hidden");
      resumeAfterQuiz();
    }, QUIZ_FEEDBACK_DELAY_MS);
    return;
  }

  registrarRespuestaIncorrecta(question, selectedOption);
  ui.quizOptions.classList.add("hidden");
  ui.quizFeedback.textContent = question.reminder || "Recuerda la información correcta.";
  ui.quizFeedback.classList.remove("hidden");
  ui.incorrectReminder.textContent =
    question.reminder || "Recuerda la información correcta.";
  ui.quizScreen.classList.add("hidden");
  ui.incorrectScreen.classList.remove("hidden");
  window.setTimeout(() => {
    ui.incorrectScreen.classList.add("hidden");
    ui.quizScreen.classList.add("hidden");
    ui.quizOptions.classList.remove("hidden");
    resumeAfterQuiz();
  }, QUIZ_REMINDER_DELAY_MS);
}

function resumeAfterQuiz() {
  state.quizActive = false;
  if (state.quizIndex >= QUIZ_QUESTIONS.length) {
    endRound();
    return;
  }
  state.running = true;
  ui.hud.classList.remove("hidden");
  ui.joystick.classList.remove("hidden");
  if (ENABLE_CAMERA_TUNER) {
    ui.cameraTuner?.classList.remove("hidden");
  }
}

function endRound() {
  stopRoundLoop();
  state.flowStage = "end";
  showScreen(ui.end);
  ui.hud.classList.add("hidden");
  ui.joystick.classList.add("hidden");
  ui.cameraTuner?.classList.add("hidden");
  ui.cameraTunerPanel?.classList.add("hidden");
  ui.endTitle.textContent = `Puntaje: ${state.score}`;
  ui.endPlayerId.textContent = `Jugador: ${state.playerName}`;
  const finalGrade = getFinalGrade();
  ui.endScoreValue.textContent = `${finalGrade}/100`;
  ui.endTimeValue.textContent = formatGameTime(state.time);
  void guardarExperienciaActual();
}

function getFinalGrade() {
  return Math.max(0, Math.min(100, state.correctLog.length * 10));
}

function stopRoundLoop() {
  state.running = false;
  state.quizActive = false;
  state.input.x = 0;
  state.input.y = 0;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  if (state.lionessAction) {
    state.lionessAction.paused = true;
  }
}

function buildSessionPayload() {
  const totalAnswers = state.correctLog.length + state.errorLog.length;
  const precision =
    totalAnswers > 0 ? Number(((state.correctLog.length / totalAnswers) * 100).toFixed(2)) : 0;

  return {
    nombre: state.firstName,
    apellido: state.lastName,
    experiencia: getExperienceName("Burberry 3D"),
    score: getFinalGrade(),
    coins_collected: state.collectedCount,
    time_total: state.time,
    errores_total: state.erroresTotal,
    rondas_completadas: state.rondasData.length,
    juego_completo: state.quizIndex >= QUIZ_QUESTIONS.length,
    porcentaje_precision: precision,
    racha_maxima: state.rachaMaxima,
    tiempo_primer_acierto: state.tiempoPrimerAcierto ?? 0,
    tiempo_primer_error: state.tiempoPrimerError ?? 0,
    rondas: state.rondasData,
    error_log: state.errorLog,
    correct_log: state.correctLog
  };
}

function ensureParticipantEmail() {
  if (state.participantEmail) return;
  const identity = createParticipantIdentity({
    firstName: state.firstName,
    lastName: state.lastName
  });
  state.participantEmail = identity.email;
  state.playerName = state.playerName || identity.fullName;
}

async function registrarAsistenteActual() {
  if (state.attendeeRecorded || state.attendeeRecording) return;
  ensureParticipantEmail();
  if (!state.participantEmail || !state.playerName) return;

  state.attendeeRecording = true;
  try {
    const result = await registrarAsistenteDatahub({
      fullName: state.playerName,
      email: state.participantEmail,
      checkInAt: state.attendeeCheckInAt || new Date().toISOString()
    });

    if (result?.ok || result?.queued) {
      state.attendeeRecorded = true;
    }
  } finally {
    state.attendeeRecording = false;
  }
}

async function guardarExperienciaActual() {
  if (state.sessionSaved || state.sessionSaving) return;
  ensureParticipantEmail();
  if (!state.sessionId || !state.startedAt) {
    const session = createSessionMetadata();
    state.sessionId = state.sessionId || session.sessionId;
    state.startedAt = state.startedAt || session.startedAt;
  }

  state.sessionSaving = true;
  try {
    state.endedAt = new Date().toISOString();
    const result = await registrarExperienciaDatahub({
      email: state.participantEmail,
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      score: getFinalGrade(),
      bonusScore: 0,
      data: buildSessionPayload()
    });

    if (result?.ok || result?.queued) {
      state.sessionSaved = true;
    }
  } catch {
    // The integration layer queues network/API failures when configuration exists.
  } finally {
    state.sessionSaving = false;
  }
}

function resetSessionMetrics() {
  state.erroresTotal = 0;
  state.rachaActual = 0;
  state.rachaMaxima = 0;
  state.tiempoPrimerAcierto = null;
  state.tiempoPrimerError = null;
  state.rondasData = [];
  state.errorLog = [];
  state.correctLog = [];
}

function registrarRespuestaCorrecta(question, selectedOption) {
  if (state.tiempoPrimerAcierto === null) {
    state.tiempoPrimerAcierto = state.time;
  }
  state.rachaActual += 1;
  state.rachaMaxima = Math.max(state.rachaMaxima, state.rachaActual);
  const roundNumber = state.currentRoundNumber || state.quizIndex;
  const elapsed = Math.max(0, state.time - state.currentRoundStartedAt);
  state.correctLog.push({
    caracteristica: question.question,
    perfume: selectedOption,
    ronda: roundNumber,
    tiempo_en_juego: state.time,
    orden_global: state.correctLog.length + 1
  });
  state.rondasData.push({
    ronda: roundNumber,
    tiempo_ronda: elapsed,
    errores_ronda: 0,
    botella_ganadora: question.options[question.correctIndex]
  });
}

function registrarRespuestaIncorrecta(question, selectedOption) {
  if (state.tiempoPrimerError === null) {
    state.tiempoPrimerError = state.time;
  }
  state.erroresTotal += 1;
  state.rachaActual = 0;
  const roundNumber = state.currentRoundNumber || state.quizIndex;
  const elapsed = Math.max(0, state.time - state.currentRoundStartedAt);
  state.errorLog.push({
    caracteristica: question.question,
    perfume_correcto: question.options[question.correctIndex],
    perfume_arrastrado: selectedOption,
    ronda: roundNumber,
    tiempo_en_juego: state.time
  });
  state.rondasData.push({
    ronda: roundNumber,
    tiempo_ronda: elapsed,
    errores_ronda: 1,
    botella_ganadora: question.options[question.correctIndex]
  });
}

function playWaitingVideo() {
  const video = ui.waitingVideo;
  if (!video) return;
  video.currentTime = 0;
  video.muted = true;
  video.playbackRate = 1;
  const playPromise = video.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {});
  }
}

function hideAllScreens() {
  [
    ui.registerScreen,
    ui.instructionsScreen,
    ui.waitingScreen,
    ui.quizScreen,
    ui.incorrectScreen,
    ui.end
  ].forEach((screen) => screen?.classList.add("hidden"));
}

function showScreen(screen) {
  hideAllScreens();
  if (screen) {
    screen.classList.remove("hidden");
  }
}

function resetInstructionsFlow() {
  state.instructionsIndex = 0;
  state.instructionsUnlocked = false;
  if (ui.instructionsTrack) {
    ui.instructionsTrack.style.transform = "translateX(0)";
  }
  setContinueButtonEnabled(false);
}

function setContinueButtonEnabled(enabled) {
  if (!ui.continueBtn) return;
  ui.continueBtn.disabled = !enabled;
  ui.continueBtn.classList.toggle("is-disabled", !enabled);
  ui.continueBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function setStartButtonEnabled(enabled) {
  if (!ui.startExperienceBtn) return;
  ui.startExperienceBtn.disabled = !enabled;
  ui.startExperienceBtn.style.opacity = enabled ? "1" : "0.45";
}

function shuffleIndices(length) {
  const result = Array.from({ length }, (_, index) => index);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatGameTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function handleResize() {
  updateAppHeight();
  if (!state.renderer || !state.camera) return;
  updateCameraProjection();
  updateCameraFollow(true);
  state.renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function updateCameraProjection() {
  if (!state.camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / Math.max(height, 1);
  const frustum = state.cameraRig.frustum;
  const viewShift = aspect < 0.7 ? CAMERA_VIEW_SHIFT_Y : CAMERA_VIEW_SHIFT_Y * 0.35;
  state.camera.left = (-frustum * aspect) / 2;
  state.camera.right = (frustum * aspect) / 2;
  state.camera.top = frustum / 2 + viewShift;
  state.camera.bottom = -frustum / 2 + viewShift;
  state.camera.near = 0.1;
  state.camera.far = 1000;
  state.camera.updateProjectionMatrix();
}

function getLandscapeMaterialTint(materialName, mapName) {
  const signature = `${materialName} ${mapName}`.toLowerCase();
  if (signature.includes("foliage") || signature.includes("treeleaves")) return 0x5f7f3d;
  if (signature.includes("treebark")) return 0x6f4d32;
  if (signature.includes("grass") || signature.includes("ground path")) return 0xcaa041;
  if (signature.includes("whatsapp image")) return 0xd6bd8b;
  if (
    signature.includes("travertine") ||
    signature.includes("statue") ||
    signature.includes("dome") ||
    signature.includes("wall") ||
    signature.includes("column") ||
    signature.includes("roof") ||
    signature.includes("material #")
  ) {
    return 0xc9ad7e;
  }
  if (signature.includes("rock") || signature.includes("debris")) return 0x8b8275;
  if (signature.includes("barrel")) return 0x7f6042;
  return 0xcdb183;
}

function shouldLandscapeCastShadow(child, materialName, mapName) {
  const signature = `${child.name || ""} ${materialName} ${mapName}`.toLowerCase();
  if (signature.includes("whatsapp image") || signature.includes("grass")) return false;
  const vertices = child.geometry?.attributes?.position?.count || 0;
  return vertices > 0 && vertices < 60000;
}

function fixLandscapeMaterial(material) {
  if (!material) return material;
  const nextMaterial = material.clone();
  const materialName = nextMaterial.name?.toLowerCase?.() || "";
  const mapName = nextMaterial.map?.name?.toLowerCase?.() || "";
  const maxAnisotropy = state.renderer?.capabilities?.getMaxAnisotropy?.() || 1;

  nextMaterial.side = THREE.DoubleSide;
  if (nextMaterial.color?.isColor) {
    nextMaterial.color.setHex(getLandscapeMaterialTint(materialName, mapName));
  }
  if ("roughness" in nextMaterial) {
    nextMaterial.roughness = Math.max(0.7, nextMaterial.roughness ?? 0.82);
  }
  if ("metalness" in nextMaterial) {
    nextMaterial.metalness = Math.min(0.04, nextMaterial.metalness ?? 0);
  }
  if ("envMapIntensity" in nextMaterial) {
    nextMaterial.envMapIntensity = 0.25;
  }
  if ("specularIntensity" in nextMaterial) {
    nextMaterial.specularIntensity = Math.min(0.28, nextMaterial.specularIntensity ?? 0.28);
  }
  if ("clearcoat" in nextMaterial) {
    nextMaterial.clearcoat = Math.min(0.08, nextMaterial.clearcoat ?? 0.08);
  }

  if (materialName.includes("tree") || materialName.includes("foliage")) {
    nextMaterial.transparent = true;
    nextMaterial.alphaTest = 0.45;
    nextMaterial.depthWrite = true;
  }

  [
    nextMaterial.map,
    nextMaterial.normalMap,
    nextMaterial.roughnessMap,
    nextMaterial.metalnessMap,
    nextMaterial.aoMap
  ].forEach((texture) => {
    if (!texture) return;
    texture.anisotropy = maxAnisotropy;
    if (texture === nextMaterial.map) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
  });

  nextMaterial.needsUpdate = true;

  return nextMaterial;
}

function updateAppHeight() {
  const appHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${appHeight}px`);
}

function activateButton(button, handler) {
  if (!button) return;
  button.onclick = handler;
}

function getCurrentPlayerQuaternionYaw() {
  if (!state.lionessRoot) return 0;
  const euler = new THREE.Euler().setFromQuaternion(state.lionessRoot.quaternion, "YXZ");
  return euler.y;
}

window.addEventListener("beforeunload", () => {
  stopRoundLoop();
  state.renderer?.dispose();
});
