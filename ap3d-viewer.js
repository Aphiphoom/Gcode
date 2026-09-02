// AP Cabinet Pro WebGL preview — SketchUp-style scene controls.
import * as THREE from 'https://esm.sh/three@0.169.0';
import { OrbitControls } from 'https://esm.sh/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';

class AP3DViewer {
  constructor(host) {
    this.host = host;
    this.edgesVisible = true;
    this.edgeObjects = [];
    this.axesVisible = true;
    this.shadowsVisible = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd2d2cf);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 5000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'ap3d-canvas';
    host.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 2000;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb5ba, 2.15));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.position.set(5, 8, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00015;
    this.scene.add(this.sun);

    this.axes = this.makeAxes(5);
    this.scene.add(this.axes);
    this.ground = null;
    this.model = null;
    this.makeToolbar();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  makeAxes(length) {
    const points = [
      new THREE.Vector3(-length, 0, 0), new THREE.Vector3(length, 0, 0),
      new THREE.Vector3(0, 0, -length), new THREE.Vector3(0, 0, length),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0)
    ];
    const colors = [
      0xd82929, 0xd82929,
      0x179641, 0x179641,
      0x2465d8, 0x2465d8
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors.flatMap(value => {
      const color = new THREE.Color(value);
      return [color.r, color.g, color.b];
    }), 3));
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
  }

  makeToolbar() {
    const bar = document.createElement('div');
    bar.className = 'ap3d-tools';
    const tools = [
      ['⌖', 'Zoom Extents', () => this.fit()],
      ['◩', 'เส้นขอบ', button => { this.edgesVisible = !this.edgesVisible; this.edgeObjects.forEach(x => x.visible = this.edgesVisible); button.classList.toggle('off', !this.edgesVisible); }],
      ['XYZ', 'แกน', button => { this.axesVisible = !this.axesVisible; this.axes.visible = this.axesVisible; button.classList.toggle('off', !this.axesVisible); }],
      ['◐', 'เงา', button => { this.shadowsVisible = !this.shadowsVisible; this.renderer.shadowMap.enabled = this.shadowsVisible; if (this.ground) this.ground.visible = this.shadowsVisible; button.classList.toggle('off', !this.shadowsVisible); }]
    ];
    tools.forEach(([label, title, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.title = title;
      button.addEventListener('click', () => action(button));
      bar.appendChild(button);
    });
    this.host.appendChild(bar);
  }

  async load(src) {
    this.host.classList.add('loading');
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground = null;
    }
    const gltf = await new GLTFLoader().loadAsync(src);
    this.model = gltf.scene;
    this.edgeObjects = [];
    this.model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        });
      }
      if (!object.isSkinnedMesh && object.geometry) {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(object.geometry, 28),
          new THREE.LineBasicMaterial({ color: 0x202428, transparent: true, opacity: 0.72, depthTest: true })
        );
        edges.renderOrder = 3;
        object.add(edges);
        this.edgeObjects.push(edges);
      }
    });
    this.scene.add(this.model);
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.1);
    this.scene.remove(this.axes);
    this.axes = this.makeAxes(span * 1.7);
    this.axes.visible = this.axesVisible;
    this.scene.add(this.axes);

    const groundGeometry = new THREE.PlaneGeometry(span * 4, span * 4);
    const groundMaterial = new THREE.ShadowMaterial({ color: 0x29343b, opacity: 0.14 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = box.min.y - Math.max(span * 0.001, 0.0005);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.fit();
    this.host.classList.remove('loading');
  }

  fit() {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const target = sphere.center.clone();
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = Math.max((sphere.radius / Math.sin(fov / 2)) * 1.08, 0.1);
    const direction = new THREE.Vector3(1.25, 0.85, 1.45).normalize();
    this.camera.position.copy(target).add(direction.multiplyScalar(distance));
    this.camera.near = Math.max(distance / 1000, 0.001);
    this.camera.far = Math.max(distance * 20, 100);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.update();
  }

  resize() {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}

window.AP3DViewer = AP3DViewer;
window.dispatchEvent(new CustomEvent('ap3d-ready'));
