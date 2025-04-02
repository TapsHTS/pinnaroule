class Game {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.player = null;
        this.cameraManager = null;
        this.items = null;
        this.clock = new THREE.Clock();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canRoll = false;
        this.pointerLocked = false;
        this.colliders = []; // Tableau pour stocker les objets avec lesquels le joueur peut entrer en collision
    }

    init() {
        // Initialiser la scène Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Ciel bleu

        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Lumière directionnelle (soleil)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        this.scene.add(directionalLight);

        // Initialiser le rendu
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Créer le sol avec texture d'herbe
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('./textures/grass.png'); // Corrigé: utilisation de .png au lieu de .jpg
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(20, 20);

        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            side: THREE.DoubleSide
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Créer quelques objets pour l'environnement
        this.createEnvironment();

        // Ajouter des arbres
        this.loadTrees();

        // Initialiser le joueur
        this.player = new Player(this.scene);

        // Initialiser la caméra
        this.cameraManager = new CameraManager(this.player);
        
        // Initialiser les objets interactifs
        this.items = new ItemManager(this.scene, this.player);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Ajouter un message initial pour informer de l'interaction à la souris
        this.showMessage("Cliquez sur l'écran pour activer les contrôles de la souris");
    }

    createEnvironment() {
        const textureLoader = new THREE.TextureLoader();
        
        // Table avec texture de bois
        const tableTexture = textureLoader.load('./textures/wood.jpg');
        tableTexture.wrapS = THREE.RepeatWrapping;
        tableTexture.wrapT = THREE.RepeatWrapping;
        tableTexture.repeat.set(2, 1);
        
        const tableMaterial = new THREE.MeshStandardMaterial({ map: tableTexture });
        const tableGeometry = new THREE.BoxGeometry(5, 1, 3);
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 0.5, -5);
        table.castShadow = true;
        table.receiveShadow = true;
        this.scene.add(table);
        
        // Ajouter la table aux colliders
        this.colliders.push({
            type: 'box',
            position: table.position.clone(),
            size: new THREE.Vector3(5, 1, 3)
        });

        // Mobilier avec texture
        const furnitureTexture = textureLoader.load('./textures/furniture.jpg');
        furnitureTexture.wrapS = THREE.RepeatWrapping;
        furnitureTexture.wrapT = THREE.RepeatWrapping;
        
        const furniturePositions = [
            { pos: [10, 1, 5], size: [2, 2, 2], color: 0x964B00 },
            { pos: [-8, 1.5, -8], size: [3, 3, 1], color: 0x696969 },
            { pos: [7, 1, -7], size: [1, 2, 4], color: 0x800000 }
        ];

        furniturePositions.forEach(item => {
            const geo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
            // Utilisation de la texture pour tout le mobilier
            const mat = new THREE.MeshStandardMaterial({ map: furnitureTexture });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            
            // Ajouter aux colliders
            this.colliders.push({
                type: 'box',
                position: mesh.position.clone(),
                size: new THREE.Vector3(item.size[0], item.size[1], item.size[2])
            });
        });
    }

    loadTrees() {
        // Utiliser OBJLoader au lieu de FBXLoader
        const mtlLoader = new THREE.MTLLoader();
        const objLoader = new THREE.OBJLoader();
        
        // Fonction pour créer un arbre à une position donnée
        const createTreeAt = (position) => {
            // Charger d'abord le fichier MTL (matériaux), s'il existe
            mtlLoader.setPath('./tree/');
            mtlLoader.load('GenTree-103_AE3D_03122023-F1.mtl', (materials) => {
                materials.preload();
                
                // Configurer l'objLoader pour utiliser les matériaux
                objLoader.setMaterials(materials);
                objLoader.setPath('./tree/');
                
                // Charger le modèle OBJ
                objLoader.load('GenTree-103_AE3D_03122023-F1.obj', (object) => {
                    // Appliquer les textures aux matériaux
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Si le matériau a un nom qui correspond à une texture
                            if (child.material) {
                                this.applyTexturesToMaterial(child);
                            }
                        }
                    });
                    
                    // Ajuster l'échelle - AUGMENTATION SIGNIFICATIVE
                    object.scale.set(0.2, 0.2, 0.2); // 10x plus grand qu'avant
                    
                    // Positionner l'arbre
                    object.position.set(position.x, 0, position.z);
                    
                    // Ajouter à la scène
                    this.scene.add(object);
                    
                    // Ajouter un collider cylindrique pour l'arbre (également plus grand)
                    this.colliders.push({
                        type: 'cylinder',
                        position: new THREE.Vector3(position.x, 5, position.z), // Hauteur ajustée
                        radius: 2, // Rayon plus large
                        height: 10 // Hauteur plus grande
                    });
                    
                    console.log(`Arbre chargé à la position (${position.x}, ${position.z})`);
                }, 
                // Progression
                (xhr) => {
                    console.log((xhr.loaded / xhr.total * 100) + '% du modèle OBJ chargé');
                },
                // Erreur
                (error) => {
                    console.error('Erreur lors du chargement du modèle OBJ:', error);
                    
                    // Fallback: essayer de charger sans MTL
                    this.loadTreeWithoutMTL(position);
                });
            },
            // Progression MTL
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% du fichier MTL chargé');
            },
            // Erreur MTL
            (error) => {
                console.error('Erreur lors du chargement du fichier MTL:', error);
                
                // Fallback: essayer de charger sans MTL
                this.loadTreeWithoutMTL(position);
            });
        };
        
        // Positions des arbres
        const treePositions = [
            { x: 15, z: 15 },
            { x: -15, z: 15 },
            { x: 15, z: -15 },
            { x: -15, z: -15 },
            { x: 5, z: 20 },
            { x: -5, z: 20 },
            { x: 0, z: -20 }
        ];
        
        // Créer un arbre à chaque position
        treePositions.forEach(position => {
            createTreeAt(position);
        });
    }
    
    // Fonction de secours pour charger l'arbre sans MTL
    loadTreeWithoutMTL(position) {
        const objLoader = new THREE.OBJLoader();
        objLoader.setPath('./tree/');
        
        objLoader.load('GenTree-103_AE3D_03122023-F1.obj', (object) => {
            // Appliquer une couleur par défaut
            object.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0x228822,
                        side: THREE.DoubleSide
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Ajuster l'échelle - AUGMENTATION SIGNIFICATIVE
            object.scale.set(0.2, 0.2, 0.2); // 10x plus grand qu'avant
            
            // Positionner l'arbre
            object.position.set(position.x, 0, position.z);
            
            // Ajouter à la scène
            this.scene.add(object);
            
            // Ajouter un collider (également plus grand)
            this.colliders.push({
                type: 'cylinder',
                position: new THREE.Vector3(position.x, 5, position.z), // Hauteur ajustée
                radius: 2, // Rayon plus large
                height: 10 // Hauteur plus grande
            });
            
            console.log(`Arbre chargé sans MTL à la position (${position.x}, ${position.z})`);
        });
    }
    
    applyTexturesToMaterial(mesh) {
        // Déterminer le type de matériau basé sur son nom ou ses propriétés
        const materialName = Array.isArray(mesh.material) 
            ? mesh.material[0].name 
            : mesh.material.name;
        
        if (!materialName) return;
        
        const textureLoader = new THREE.TextureLoader();
        const texturePath = './tree/textures/';
        
        // Map les noms de matériaux aux fichiers de texture spécifiques
        // Basé sur la liste des fichiers fournis
        if (materialName.toLowerCase().includes('trunk') || materialName.toLowerCase().includes('limb')) {
            // Textures pour le tronc et les branches principales
            this.loadTrunkTextures(mesh, textureLoader, texturePath);
        } else if (materialName.toLowerCase().includes('twig')) {
            // Textures pour les petites branches
            this.loadTwigTextures(mesh, textureLoader, texturePath);
        } else if (materialName.toLowerCase().includes('leaf') || materialName.toLowerCase().includes('feuille')) {
            // Textures pour les feuilles
            this.loadLeafTextures(mesh, textureLoader, texturePath);
        } else {
            // Si on ne peut pas déterminer le type, essayer les textures génériques
            console.log(`Type de matériau non identifié: ${materialName}, utilisation de couleurs par défaut`);
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => {
                    mat.color = new THREE.Color(0x228822);
                });
            } else {
                mesh.material.color = new THREE.Color(0x228822);
            }
        }
    }
    
    loadTrunkTextures(mesh, textureLoader, texturePath) {
        const applyTexture = (material) => {
            // Charger la texture diffuse (couleur)
            textureLoader.load(
                texturePath + 'GenTree_2_Trunk_Limbs_AE3D_03312023-A-DIFFUSE.png',
                (texture) => {
                    console.log('Texture de tronc diffuse chargée');
                    material.map = texture;
                    material.needsUpdate = true;
                }
            );
            
            // Charger la texture normale
            textureLoader.load(
                texturePath + 'GenTree_2_Trunk_Limbs_AE3D_03312023-A-NORMAL.png',
                (texture) => {
                    console.log('Texture de tronc normale chargée');
                    material.normalMap = texture;
                    material.needsUpdate = true;
                }
            );
            
            // Charger la texture de rugosité
            textureLoader.load(
                texturePath + 'GenTree_2_Trunk_Limbs_AE3D_03312023-A-SMOOTH.png',
                (texture) => {
                    console.log('Texture de tronc rugosité chargée');
                    material.roughnessMap = texture;
                    material.roughness = 0.8; // Ajuster la rugosité
                    material.needsUpdate = true;
                }
            );
            
            // Charger la texture de déplacement
            textureLoader.load(
                texturePath + 'GenTree_2_Trunk_Limbs_AE3D_03312023-A-HEIGHT.png',
                (texture) => {
                    console.log('Texture de tronc hauteur chargée');
                    material.displacementMap = texture;
                    material.displacementScale = 0.1; // Ajuster l'échelle de déplacement
                    material.needsUpdate = true;
                }
            );
        };
        
        // Appliquer les textures à tous les matériaux
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => applyTexture(mat));
        } else {
            applyTexture(mesh.material);
        }
    }
    
    loadTwigTextures(mesh, textureLoader, texturePath) {
        const applyTexture = (material) => {
            // Charger la texture pour les branches
            textureLoader.load(
                texturePath + 'Gentree_2_Twigs_AE3D_04022023-B-DIFFUSE.jpg',
                (texture) => {
                    console.log('Texture de branches chargée');
                    material.map = texture;
                    material.side = THREE.DoubleSide;
                    material.needsUpdate = true;
                }
            );
        };
        
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => applyTexture(mat));
        } else {
            applyTexture(mesh.material);
        }
    }
    
    loadLeafTextures(mesh, textureLoader, texturePath) {
        const applyTexture = (material) => {
            // Charger la texture pour les feuilles en utilisant directement le chemin absolu
            textureLoader.load(
                './tree/textures/Leaf_Oak_Gum_AE3D_10302022-A.png', // Chemin direct au lieu d'utiliser texturePath
                (texture) => {
                    console.log('Texture de feuilles chargée');
                    material.map = texture;
                    material.transparent = true;
                    material.side = THREE.DoubleSide;
                    material.alphaTest = 0.5; // Pour le rendu correct de la transparence
                    material.needsUpdate = true;
                }
            );
        };
        
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => applyTexture(mat));
        } else {
            applyTexture(mesh.material);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyS':
                    this.moveForward = true;
                    break;
                case 'KeyZ':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                case 'KeyQ':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyY':
                    this.cameraManager.toggleView();
                    break;
                case 'KeyE':
                    this.items.checkInteraction();
                    this.checkRolling();
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyS':
                    this.moveForward = false;
                    break;
                case 'KeyZ':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                case 'KeyQ':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        });

        // Gestion du clic pour activer les contrôles de souris
        document.addEventListener('click', () => {
            if (!this.pointerLocked) {
                document.body.requestPointerLock();
            }
        });

        // Gestion du verrouillage/déverrouillage du pointeur
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement !== null;
        });
    }

    handleKeyDown(event) {
        // Géré par setupEventListeners
    }

    handleKeyUp(event) {
        // Géré par setupEventListeners
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.cameraManager.updateAspect(width / height);
    }

    checkRolling() {
        if (this.items.hasAllItems() && !this.canRoll) {
            this.canRoll = true;
            this.showMessage("Appuyez sur E près de la table pour rouler votre cigarette!");
        }

        if (this.canRoll && this.isPlayerNearTable()) {
            this.rollCigarette();
        }
    }

    isPlayerNearTable() {
        const position = this.player.getPosition();
        // Vérifie si le joueur est près de la table (coordonnées [0, 0.5, -5])
        return position.distanceTo(new THREE.Vector3(0, 0.5, -5)) < 3;
    }

    rollCigarette() {
        this.showMessage("Félicitations! Vous avez roulé une cigarette parfaite avec taga!");
        
        // Charger le modèle 3D de cigarette
        const loader = new THREE.GLTFLoader();
        
        // Ajouter lumière supplémentaire pour mettre en valeur la cigarette
        const spotLight = new THREE.SpotLight(0xFFFFFF, 1);
        spotLight.position.set(0, 3, -5);
        spotLight.target.position.set(0, 1.5, -5);
        spotLight.castShadow = true;
        spotLight.angle = Math.PI / 4;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
        
        console.log("Chargement du modèle cigarette.glb...");
        
        loader.load('./cigarette.glb', 
            // Callback de succès
            (gltf) => {
                console.log("Modèle cigarette.glb chargé avec succès!", gltf);
                
                const cigarette = gltf.scene;
                
                // Ajuster l'échelle (peut nécessiter des ajustements selon la taille du modèle)
                cigarette.scale.set(0.5, 0.5, 0.5); // Essayer différentes échelles si nécessaire
                
                // Positionner sur la table
                cigarette.position.set(0, 1.5, -5);
                
                // Ajuster la rotation si nécessaire
                cigarette.rotation.set(0, 0, 0); // Réinitialiser la rotation
                // cigarette.rotation.x = Math.PI / 2; // Décommenter et ajuster si nécessaire
                
                // Améliorer les matériaux pour s'assurer que les textures sont visibles
                cigarette.traverse((node) => {
                    if (node.isMesh) {
                        console.log("Traitement du mesh:", node.name);
                        
                        // S'assurer que les matériaux prennent en compte l'éclairage
                        node.castShadow = true;
                        node.receiveShadow = true;
                        
                        if (node.material) {
                            // Vérifier et ajuster chaque matériau
                            if (Array.isArray(node.material)) {
                                node.material.forEach(mat => this.enhanceMaterial(mat));
                            } else {
                                this.enhanceMaterial(node.material);
                            }
                        }
                    }
                });
                
                // Ajouter le marqueur taga
                if (this.items.inventoryItems.taga) {
                    const tagaMarkerGeometry = new THREE.SphereGeometry(0.06, 16, 16);
                    const tagaMarkerMaterial = new THREE.MeshStandardMaterial({ 
                        color: 0xA52A2A,
                        emissive: 0xA52A2A,
                        emissiveIntensity: 0.5
                    });
                    const tagaMarker = new THREE.Mesh(tagaMarkerGeometry, tagaMarkerMaterial);
                    
                    // Positionner le marqueur sur la cigarette (ajuster selon la forme du modèle)
                    tagaMarker.position.set(0, 0.1, 0);
                    cigarette.add(tagaMarker);
                }
                
                this.scene.add(cigarette);
                console.log('Modèle de cigarette ajouté à la scène');
            },
            // Callback de progression
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% du modèle cigarette chargé');
            },
            // Callback d'erreur
            (error) => {
                console.error('Erreur lors du chargement du modèle cigarette:', error);
                this.createFallbackCigarette();
            }
        );
        
        this.canRoll = false;
    }
    
    // Nouvelle méthode pour améliorer les matériaux
    enhanceMaterial(material) {
        console.log("Amélioration du matériau:", material);
        
        // Augmenter l'intensité de la couleur
        if (material.color) {
            material.color.multiplyScalar(1.2);
        }
        
        // Ajouter une émission légère pour plus de visibilité
        material.emissive = new THREE.Color(0x222222);
        material.emissiveIntensity = 0.2;
        
        // S'assurer que la texture est correctement appliquée
        if (material.map) {
            console.log("Le matériau a une texture map");
            material.map.encoding = THREE.sRGBEncoding;
            material.map.needsUpdate = true;
        } else {
            console.log("Le matériau n'a pas de texture map");
        }
        
        material.needsUpdate = true;
    }

    createFallbackCigarette() {
        // Méthode de secours qui crée une cigarette simple si le chargement du modèle échoue
        const cigaretteGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
        const cigaretteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE8D598,
            emissive: 0x553311,
            emissiveIntensity: 0.2
        });
        const cigarette = new THREE.Mesh(cigaretteGeometry, cigaretteMaterial);
        cigarette.position.set(0, 1.5, -5);
        cigarette.rotation.x = Math.PI / 2;
        
        // Ajouter le marqueur taga
        const tagaMarkerGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const tagaMarkerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xA52A2A,
            emissive: 0xA52A2A,
            emissiveIntensity: 0.3
        });
        const tagaMarker = new THREE.Mesh(tagaMarkerGeometry, tagaMarkerMaterial);
        tagaMarker.position.set(0, 0.3, 0);
        cigarette.add(tagaMarker);
        
        this.scene.add(cigarette);
        console.log('Utilisation du modèle de cigarette de secours');
    }

    showMessage(text) {
        let messageEl = document.getElementById('message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'message';
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    checkCollisions(playerPosition, playerRadius) {
        let colliding = false;
        
        for (const collider of this.colliders) {
            if (collider.type === 'box') {
                // Collision avec une boîte (comme la table)
                const minX = collider.position.x - collider.size.x / 2 - playerRadius;
                const maxX = collider.position.x + collider.size.x / 2 + playerRadius;
                const minZ = collider.position.z - collider.size.z / 2 - playerRadius;
                const maxZ = collider.position.z + collider.size.z / 2 + playerRadius;
                
                if (playerPosition.x > minX && playerPosition.x < maxX && 
                    playerPosition.z > minZ && playerPosition.z < maxZ) {
                    colliding = true;
                    break;
                }
            } 
            else if (collider.type === 'cylinder') {
                // Collision avec un cylindre (comme un tronc d'arbre)
                const dx = playerPosition.x - collider.position.x;
                const dz = playerPosition.z - collider.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < collider.radius + playerRadius) {
                    colliding = true;
                    break;
                }
            }
        }
        
        return colliding;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Mettre à jour le mouvement du joueur avec la détection de collision
        if (this.player) {
            const proposedPosition = this.player.calculateNextPosition(delta, this.moveForward, this.moveBackward, this.moveLeft, this.moveRight);
            
            // Vérifier si la position proposée est en collision avec un objet
            if (!this.checkCollisions(proposedPosition, 0.5)) {
                this.player.applyMovement(proposedPosition);
            }
            // Sinon, le joueur reste à sa position actuelle
        }
        
        // Mettre à jour la caméra
        if (this.cameraManager) {
            this.cameraManager.update();
        }
        
        // Rendu de la scène
        this.renderer.render(this.scene, this.cameraManager.getActiveCamera());
    }
}
