// Wrap the entire logic in a function that runs after the page is fully loaded
function init3DViewer() {
    try {
        // --- PRE-FLIGHT CHECK ---
        if (typeof THREE === 'undefined') {
            console.error("FATAL ERROR: THREE.js library not loaded. Check the script tags in your HTML file.");
            return;
        }

        // --- DOM Elements ---
        const canvas = document.getElementById('viewer-canvas');
        const modelInfoDisplay = document.getElementById('model-info-display');
        const modelGridContainer = document.getElementById('model-grid-container');

        if (!canvas || !models || models.length === 0) {
            console.error('Required elements for 3D viewer are missing.');
            return;
        }

        // --- Three.js Scene Setup ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x282c34);

        const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;

        // --- Controls ---
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // --- Loading Manager ---
        const loadingManager = new THREE.LoadingManager();
        const loader = new THREE.GLTFLoader(loadingManager);
        let currentModel = null;

        function loadModel(modelData) {
            if (!modelData || !modelData.glbPath) return;
            if (currentModel) scene.remove(currentModel);

            loader.load(modelData.glbPath, (gltf) => {
                currentModel = gltf.scene;
                const box = new THREE.Box3().setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                
                camera.position.copy(center);
                camera.position.z += cameraDistance * 1.5;
                camera.lookAt(center);
                
                controls.target.copy(center);
                controls.update();
                
                scene.add(currentModel);
                updateModelInfo(modelData);
            }, undefined, (error) => {
                console.error("Failed to load GLB model:", error);
            });
        }

        function updateModelInfo(modelData) {
            modelInfoDisplay.innerHTML = `<h2>${modelData.name}</h2><p>${modelData.description}</p>`;
        }

        // --- Gallery Setup ---
        function populateGallery() {
            if (!modelGridContainer) return;
            modelGridContainer.innerHTML = '';
            models.forEach(model => {
                const card = document.createElement('div');
                card.className = 'model-card';
                card.innerHTML = `<img src="${model.thumbnail}" alt="${model.name}"><div class="model-card-title">${model.name}</div>`;
                card.addEventListener('click', () => loadModel(model));
                modelGridContainer.appendChild(card);
            });
        }

        // --- Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }

        // --- Handle Window Resize ---
        window.addEventListener('resize', () => {
            const container = canvas.parentElement;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // --- Initial Load ---
        populateGallery();
        loadModel(models[0]); // Lädt das erste Modell (Space Explorer)
        animate();

    } catch (error) {
        console.error("A critical error occurred in the 3D viewer script:", error);
    }
}

// Use window.onload to ensure all external scripts are fully loaded and ready
window.onload = init3DViewer;
