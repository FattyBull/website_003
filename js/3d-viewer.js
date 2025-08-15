document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('viewer-canvas')) {
        console.log('3D Catalog page detected. Initializing viewer...');

        if (typeof mockModelData !== 'undefined') {
            console.log('Loading assets from local mock-assets.js');
            initializeLibrary(mockModelData);
        } else {
            console.log('Fetching assets from live API...');
            fetch('/api/?get=assets')
                .then(response => response.json())
                .then(models => {
                    if (!models) throw new Error("API returned no models.");
                    const formattedModels = models.map(m => ({ ...m, category: m.category_name }));
                    initializeLibrary(formattedModels);
                })
                .catch(error => console.error('Error fetching assets for 3D viewer:', error));
        }
    }
});

// --- Global State ---
let allModels = [];
let currentCategory = 'All';
let currentLoadedModel = null;
let currentViewMode = 'standard';
let scene, camera, renderer, controls, loader;

function initializeLibrary(models) {
    if (!models || models.length === 0) {
        console.error("Initialization failed: No models provided.");
        return;
    }
    allModels = models;
    
    setup3DScene();
    setupUI();

    const featuredModel = allModels.find(m => m.id === 1) || allModels[0];
    if (featuredModel) {
        loadModelById(featuredModel.id);
    }
}

function setupUI() {
    setupCategoryFilters();
    setupSearch();
    updateGallery();
    setupGalleryClickListener();
    setupViewerControlsListener();
    setupSidebarToggle(); 
}

function setup3DScene() {
    const canvas = document.getElementById('viewer-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34); 

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    loader = new THREE.GLTFLoader();

    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const container = canvas.parentElement;
        if (container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
}

function loadModelById(modelId) {
    const modelData = allModels.find(m => m.id == modelId);
    if (!modelData || !modelData.path_glb) return;

    if (currentLoadedModel) scene.remove(currentLoadedModel);

    loader.load(modelData.path_glb, (gltf) => {
        currentLoadedModel = gltf.scene;
        currentLoadedModel.traverse(child => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.originalMaterial = child.material.map(mat => mat.clone());
                } else {
                    child.originalMaterial = child.material.clone();
                }
            }
        });
        updateViewMode(currentViewMode);
        const box = new THREE.Box3().setFromObject(currentLoadedModel);
        const center = box.getCenter(new THREE.Vector3());
        currentLoadedModel.position.sub(center);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
        camera.position.set(0, 0, cameraZ);
        camera.lookAt(0, 0, 0);
        controls.target.copy(new THREE.Vector3(0, 0, 0));
        controls.update();
        scene.add(currentLoadedModel);
    }, undefined, (error) => console.error(`Failed to load GLB model:`, error));
}

function updateViewMode(mode) {
    if (!currentLoadedModel) return;
    currentViewMode = mode;

    currentLoadedModel.traverse(child => {
        if (child.isMesh && child.originalMaterial) {
            
            const createDebugMaterial = (originalMat) => {
                switch(mode) {
                    case 'standard':
                        return originalMat.clone();
                    
                    case 'wireframe':
                        const wireframeMat = originalMat.clone();
                        wireframeMat.wireframe = true;
                        return wireframeMat;

                    case 'basecolor':
                        return new THREE.MeshBasicMaterial({
                            map: originalMat.map || null,
                            color: originalMat.color || 0xffffff
                        });

                    case 'normal':
                        return new THREE.MeshStandardMaterial({
                            color: 0x808080,
                            normalMap: originalMat.normalMap || null,
                            normalScale: originalMat.normalScale || new THREE.Vector2(1, 1)
                        });

                    case 'roughness':
                        return new THREE.MeshStandardMaterial({
                            color: 0x808080,
                            metalness: 0.0,
                            roughnessMap: originalMat.roughnessMap || null,
                            roughness: originalMat.roughnessMap ? 1.0 : 0.5
                        });

                    case 'metallic':
                        return new THREE.MeshStandardMaterial({
                            color: 0x808080,
                            roughness: 0.2,
                            metalnessMap: originalMat.metalnessMap || null,
                            metalness: originalMat.metalnessMap ? 1.0 : 1.0
                        });
                    
                    default:
                        return originalMat.clone();
                }
            };

            if (Array.isArray(child.originalMaterial)) {
                child.material = child.originalMaterial.map(mat => createDebugMaterial(mat));
            } else {
                child.material = createDebugMaterial(child.originalMaterial);
            }
        }
    });
}


function setupCategoryFilters() {
    const filtersContainer = document.getElementById('category-filters');
    if (!filtersContainer) return;
    const categories = ['All', ...new Set(allModels.map(m => m.category).filter(Boolean))];
    filtersContainer.innerHTML = categories.map(cat => 
        `<button class="category-btn ${cat === 'All' ? 'active' : ''}" data-category="${cat}">${cat}</button>`
    ).join('');
    
    filtersContainer.addEventListener('click', e => {
        if (e.target.matches('.category-btn')) {
            const currentActive = filtersContainer.querySelector('.active');
            if (currentActive) currentActive.classList.remove('active');
            e.target.classList.add('active');
            
            currentCategory = e.target.dataset.category;
            updateGallery();
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('library-search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', updateGallery);
}

function updateGallery() {
    const searchInput = document.getElementById('library-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    let filteredModels = allModels;
    if (currentCategory !== 'All') {
        filteredModels = allModels.filter(m => m.category === currentCategory);
    }
    if (searchTerm) {
        filteredModels = filteredModels.filter(m => 
            (m.name && m.name.toLowerCase().includes(searchTerm)) ||
            (m.description && m.description.toLowerCase().includes(searchTerm))
        );
    }
    populateGallery(filteredModels);
}

function populateGallery(models) {
    const modelGridContainer = document.getElementById('model-grid-container');
    if (!modelGridContainer) return;
    modelGridContainer.innerHTML = models.length === 0 
        ? '<p class="no-results">No models found.</p>'
        : models.map(model => `
            <div class="model-card" data-model-id="${model.id}">
                <img src="${model.path_thumbnail}" alt="${model.name}" onerror="this.src='https://placehold.co/400x400/282c34/ffffff?text=No+Image'">
                <div class="model-card-title">${model.name}</div>
            </div>
        `).join('');
}

function setupGalleryClickListener() {
    const grid = document.getElementById('model-grid-container');
    if (!grid) return;
    grid.addEventListener('click', e => {
        const card = e.target.closest('.model-card');
        if (card && card.dataset.modelId) {
            loadModelById(card.dataset.modelId);
        }
    });
}

function setupViewerControlsListener() {
    const controlsContainer = document.getElementById('viewer-controls');
    if (!controlsContainer) return;
    controlsContainer.addEventListener('click', e => {
        if (e.target.matches('.viewer-btn')) {
            const mode = e.target.dataset.mode;
            const currentActive = controlsContainer.querySelector('.viewer-btn.active');
            if(currentActive) currentActive.classList.remove('active');
            e.target.classList.add('active');
            updateViewMode(mode);
        }
    });
}

function setupSidebarToggle() {
    const sidebar = document.getElementById('viewer-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');
        });
    }
}
