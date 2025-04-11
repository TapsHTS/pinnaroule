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

        // Ajouter la maison de dépôt
        this.createDepositHouse();

        // Ajouter des arbres
        this.loadTrees();

        // Agrandir les feuilles de tous les arbres dans la scène
        this.enlargeAllTreeLeaves(this.scene, 2.0);

        // Initialiser le joueur
        this.player = new Player(this.scene);

        // Initialiser la caméra
        this.cameraManager = new CameraManager(this.player);
        
        // Initialiser les objets interactifs en passant les colliders
        this.items = new ItemManager(this.scene, this.player);
        this.items.gameColliders = this.colliders; // Partage les colliders avec ItemManager
        this.items.game = this; // Donner une référence directe au jeu
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Ajouter un message initial pour informer de l'interaction à la souris
        this.showMessage("Cliquez sur l'écran pour activer les contrôles de la souris");

        // Rendre le jeu accessible globalement pour l'interaction
        window.game = this;

        // Ajouter une propriété pour suivre l'état d'animation
        this.animationInProgress = false;
        
        // Timestamp pour le calcul du delta time
        this.lastUpdateTime = Date.now();
    }

    createEnvironment() {
        const textureLoader = new THREE.TextureLoader();
        
        // Suppression de la table
        
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

    enlargeAllTreeLeaves(scene, scaleFactor = 1.5) {
        scene.traverse(function(object) {
            // Identifier les objets qui sont des arbres ou leurs composants
            if (object.isMesh && 
                (object.name.toLowerCase().includes('tree') || 
                 object.name.toLowerCase().includes('arbre'))) {
                
                object.traverse(function(child) {
                    // Recherche les objets qui représentent des feuilles
                    if (child.isMesh && 
                       (child.name.toLowerCase().includes('leaf') || 
                        child.name.toLowerCase().includes('leaves') || 
                        child.name.toLowerCase().includes('feuille') || 
                        child.name.toLowerCase().includes('feuilles'))) {
                        
                        // Applique le facteur d'échelle aux feuilles
                        child.scale.set(
                            child.scale.x * scaleFactor,
                            child.scale.y * scaleFactor,
                            child.scale.z * scaleFactor
                        );
                        
                        console.log(`Feuilles d'arbre agrandies: ${child.name}`);
                    }
                });
            }
        });
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
                    break;
                case 'KeyU':
                    // Nouvelle touche pour fumer une cigarette
                    if (this.items && !this.animationInProgress) {
                        this.items.startSmoking();
                    }
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
        // Cette méthode n'est plus utilisée car les cigarettes
        // sont maintenant créées via le dépôt d'objets dans la maison
    }
    
    // Méthode pour vérifier si le joueur est près de la zone de dépôt
    updateDepositInteraction() {
        if (this.depositZone && this.player) {
            const playerPosition = this.player.getPosition();
            const distance = playerPosition.distanceTo(this.depositZonePosition);
            
            // Mettre à jour la visibilité du texte flottant
            if (distance < 5) {
                // Calculer la position à l'écran
                const vector = this.depositZonePosition.clone();
                vector.y += 1.5; // Placer le texte au-dessus de la zone
                
                // Projeter la position 3D en coordonnées 2D
                vector.project(this.cameraManager.getActiveCamera());
                
                // Convertir en coordonnées d'écran
                const widthHalf = window.innerWidth / 2;
                const heightHalf = window.innerHeight / 2;
                
                const x = (vector.x * widthHalf) + widthHalf;
                const y = -(vector.y * heightHalf) + heightHalf;
                
                // Mettre à jour la position du texte
                if (this.depositText) {
                    this.depositText.style.left = x + 'px';
                    this.depositText.style.top = y + 'px';
                    this.depositText.style.visibility = 'visible';
                }
            } else if (this.depositText) {
                // Cacher le texte si le joueur est trop loin
                this.depositText.style.visibility = 'hidden';
            }
        }
    }

    isPlayerNearTable() {
        // Nouvelle implémentation : toujours retourner true
        // Le joueur peut maintenant rouler une cigarette n'importe où
        return true;
    }

    rollCigarette() {
        // Version simplifiée sans création visuelle de cigarette
        this.showMessage("Félicitations! Vous avez roulé une cigarette parfaite!");
        
        // Appeler la méthode qui gère le compteur dans ItemManager
        this.items.createCigarette();
        
        // Réinitialiser l'état pour permettre de rouler à nouveau
        this.canRoll = false;
    }

    createFallbackCigarette() {
        // Cette méthode n'est plus utilisée
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
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convertir en secondes
        this.lastUpdateTime = currentTime;
        
        // Ne pas mettre à jour le mouvement du joueur si une animation est en cours
        if (this.player && !this.animationInProgress) {
            const proposedPosition = this.player.calculateNextPosition(deltaTime, this.moveForward, this.moveBackward, this.moveLeft, this.moveRight);
            
            // Vérifier si la position proposée est en collision avec un objet
            if (!this.checkCollisions(proposedPosition, 0.5)) {
                this.player.applyMovement(proposedPosition);
            }
        }
        
        // Mettre à jour la caméra
        if (this.cameraManager) {
            this.cameraManager.update();
        }
        
        // Mettre à jour les animations de cigarette et fumée
        if (this.items) {
            this.items.update(deltaTime);
        }
        
        // Mettre à jour l'interaction avec la zone de dépôt
        this.updateDepositInteraction();
        
        // Rendu de la scène
        this.renderer.render(this.scene, this.cameraManager.getActiveCamera());
    }

    // Nouvelle méthode pour créer la maison de dépôt
    createDepositHouse() {
        // Position de la maison
        const housePosition = new THREE.Vector3(10, 0, -15);
        
        // Dimensions de la maison
        const width = 8;
        const height = 6;
        const depth = 8;
        
        // Charger les textures
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('./textures/wall.jpg');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(2, 2);
        
        const roofTexture = textureLoader.load('./textures/roof.jpg');
        roofTexture.wrapS = THREE.RepeatWrapping;
        roofTexture.wrapT = THREE.RepeatWrapping;
        roofTexture.repeat.set(4, 4);
        
        const woodTexture = textureLoader.load('./textures/wood.png');
        woodTexture.wrapS = THREE.RepeatWrapping;
        woodTexture.wrapT = THREE.RepeatWrapping;
        woodTexture.repeat.set(2, 2);
        
        // Créer le matériau des murs
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: wallTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Créer la maison avec une entrée ouverte
        const house = new THREE.Group();
        
        // Dimensions de l'entrée
        const entranceWidth = 2;
        const entranceHeight = 3.5;
        
        // Mur avant gauche (à côté de l'entrée)
        const leftEntranceWidth = (width - entranceWidth) / 2;
        const frontWallLeftGeometry = new THREE.BoxGeometry(leftEntranceWidth, height, 0.3);
        const frontWallLeft = new THREE.Mesh(frontWallLeftGeometry, wallMaterial);
        frontWallLeft.position.set(-width/2 + leftEntranceWidth/2, height/2, depth/2);
        house.add(frontWallLeft);
        
        // Mur avant droit (à côté de l'entrée)
        const frontWallRightGeometry = new THREE.BoxGeometry(leftEntranceWidth, height, 0.3);
        const frontWallRight = new THREE.Mesh(frontWallRightGeometry, wallMaterial);
        frontWallRight.position.set(width/2 - leftEntranceWidth/2, height/2, depth/2);
        house.add(frontWallRight);
        
        // Linteau au-dessus de l'entrée
        const lintelGeometry = new THREE.BoxGeometry(entranceWidth, height - entranceHeight, 0.3);
        const lintel = new THREE.Mesh(lintelGeometry, wallMaterial);
        lintel.position.set(0, height - (height - entranceHeight)/2, depth/2);
        house.add(lintel);
        
        // Ajouter les autres murs
        const backWallGeometry = new THREE.BoxGeometry(width, height, 0.3);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.set(0, height/2, -depth/2);
        house.add(backWall);
        
        const leftWallGeometry = new THREE.BoxGeometry(0.3, height, depth);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(-width/2, height/2, 0);
        house.add(leftWall);
        
        const rightWallGeometry = new THREE.BoxGeometry(0.3, height, depth);
        const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWall.position.set(width/2, height/2, 0);
        house.add(rightWall);
        
        // Sol de la maison
        const floorGeometry = new THREE.BoxGeometry(width, 0.3, depth);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(0, 0.15, 0);
        house.add(floor);
        
        // Ajouter une table au centre de la maison
        const tableWidth = 2;
        const tableHeight = 1;
        const tableDepth = 1.5;
        const tableGeometry = new THREE.BoxGeometry(tableWidth, tableHeight, tableDepth);
        const tableMaterial = new THREE.MeshStandardMaterial({ 
            map: woodTexture,
            roughness: 0.5,
            metalness: 0.1
        });
        
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, tableHeight/2, -1); // Positionner la table à l'intérieur de la maison
        house.add(table);
        
        // Ajouter les pieds de la table
        const legRadius = 0.08;
        const legHeight = tableHeight;
        const legGeometry = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            map: woodTexture,
            roughness: 0.6,
            metalness: 0.1
        });
        
        // Positions des pieds par rapport à la table
        const legPositions = [
            [-tableWidth/2 + legRadius, -tableHeight/2, -tableDepth/2 + legRadius],
            [tableWidth/2 - legRadius, -tableHeight/2, -tableDepth/2 + legRadius],
            [-tableWidth/2 + legRadius, -tableHeight/2, tableDepth/2 - legRadius],
            [tableWidth/2 - legRadius, -tableHeight/2, tableDepth/2 - legRadius]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            table.add(leg);
        });
        
        // Positionner la maison
        house.position.copy(housePosition);
        this.scene.add(house);
        
        // Ajouter un toit
        const roofHeight = 3;
        const roofGeometry = new THREE.ConeGeometry(width * 0.8, roofHeight, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            map: roofTexture,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.copy(housePosition);
        roof.position.y = height + roofHeight / 2;
        roof.rotation.y = Math.PI / 4; // Rotation pour aligner avec les murs
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.scene.add(roof);
        
        // Ajouter une fenêtre
        const windowWidth = 1.2;
        const windowHeight = 1.2;
        const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const windowTexture = textureLoader.load('./textures/window.jpg');
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            map: windowTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        // Fenêtre avant
        const windowFront = new THREE.Mesh(windowGeometry, windowMaterial);
        windowFront.position.copy(housePosition);
        windowFront.position.z += depth / 2 + 0.05;
        windowFront.position.x += 2;
        windowFront.position.y = height / 2 + 1;
        windowFront.castShadow = true;
        windowFront.receiveShadow = true;
        this.scene.add(windowFront);
        
        // Fenêtre sur le côté
        const windowSide = new THREE.Mesh(windowGeometry, windowMaterial);
        windowSide.position.copy(housePosition);
        windowSide.position.x += width / 2 + 0.05;
        windowSide.position.y = height / 2 + 1;
        windowSide.rotation.y = Math.PI / 2;
        windowSide.castShadow = true;
        windowSide.receiveShadow = true;
        this.scene.add(windowSide);

        // Ajouter de l'éclairage à l'intérieur de la maison
        const pointLight = new THREE.PointLight(0xFFD700, 1, 10);
        pointLight.position.copy(housePosition);
        pointLight.position.y = height / 2;
        pointLight.castShadow = true;
        this.scene.add(pointLight);
        
        // Ajouter une lumière ambiante à l'intérieur
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
        house.add(ambientLight);
        
        // Ajouter une lumière spot pour simuler une lampe
        const spotLight = new THREE.SpotLight(0xFFFFFF, 1);
        spotLight.position.copy(housePosition);
        spotLight.position.y = height - 0.5;
        spotLight.target.position.copy(housePosition); // Diriger vers le sol
        spotLight.target.position.y = 0;
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.2;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
        
        // Lumière à l'entrée de la maison pour mettre en évidence l'entrée
        const entranceLight = new THREE.SpotLight(0xFFFFFF, 1.5);
        entranceLight.position.copy(housePosition);
        entranceLight.position.z += depth / 2 - 1; // Juste à l'intérieur de l'entrée
        entranceLight.position.y = entranceHeight - 0.5;
        entranceLight.target.position.copy(housePosition);
        entranceLight.target.position.z = depth / 2 + 3; // Diriger vers l'extérieur
        entranceLight.angle = Math.PI / 3;
        entranceLight.penumbra = 0.3;
        entranceLight.castShadow = true;
        this.scene.add(entranceLight);
        this.scene.add(entranceLight.target);
        
        // Zone de dépôt sur la table (à l'intérieur de la maison)
        const depositZoneSize = 1.5;
        const depositZoneHeight = 0.05;
        const depositZoneGeometry = new THREE.BoxGeometry(depositZoneSize, depositZoneHeight, depositZoneSize);
        const depositZoneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        const depositZone = new THREE.Mesh(depositZoneGeometry, depositZoneMaterial);
        depositZone.position.set(0, tableHeight + depositZoneHeight/2, -1); // Positionner sur la table
        house.add(depositZone);
        
        // Effet de halo lumineux au-dessus de la zone de dépôt
        const depositLight = new THREE.PointLight(0xFFD700, 1, 3);
        depositLight.position.set(0, tableHeight + 1, -1);
        house.add(depositLight);
        
        // Ajouter un texte flottant "Zone de dépôt"
        const depositText = document.createElement('div');
        depositText.className = 'deposit-text';
        depositText.textContent = 'Déposez les objets sur la table';
        depositText.style.position = 'absolute';
        depositText.style.pointerEvents = 'none';
        depositText.style.visibility = 'hidden';
        depositText.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        depositText.style.color = 'white';
        depositText.style.padding = '5px 10px';
        depositText.style.borderRadius = '5px';
        depositText.style.fontSize = '16px';
        document.body.appendChild(depositText);
        
        // Stocker la référence à la zone de dépôt et sa position absolue (pas relative à la maison)
        this.depositZone = depositZone;
        this.depositZonePosition = new THREE.Vector3(
            housePosition.x,
            housePosition.y + tableHeight + depositZoneHeight/2,
            housePosition.z - 1
        );
        console.log("Position de la zone de dépôt:", this.depositZonePosition);
        
        this.depositText = depositText;
        
        // Ajouter un collider pour la table
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x, tableHeight/2, housePosition.z - 1),
            size: new THREE.Vector3(tableWidth, tableHeight, tableDepth)
        });
        
        // Ajouter des colliders pour la maison (en excluant la zone d'entrée)
        // Côtés de la maison
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x - width/2, height/2, housePosition.z),
            size: new THREE.Vector3(0.3, height, depth)
        });
        
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x + width/2, height/2, housePosition.z),
            size: new THREE.Vector3(0.3, height, depth)
        });
        
        // Mur arrière
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x, height/2, housePosition.z - depth/2),
            size: new THREE.Vector3(width, height, 0.3)
        });
        
        // Murs avant (de chaque côté de l'entrée)
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x - width/2 + leftEntranceWidth/2, height/2, housePosition.z + depth/2),
            size: new THREE.Vector3(leftEntranceWidth, height, 0.3)
        });
        
        this.colliders.push({
            type: 'box',
            position: new THREE.Vector3(housePosition.x + width/2 - leftEntranceWidth/2, height/2, housePosition.z + depth/2),
            size: new THREE.Vector3(leftEntranceWidth, height, 0.3)
        });
        
        console.log('Maison avec table de dépôt créée à la position:', housePosition);
        this.showMessage("Entrez dans la maison et déposez les objets sur la table!");
    }
}
