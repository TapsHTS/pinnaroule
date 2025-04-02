class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.model = null;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 10;
        this.rotationSpeed = 2;
        this.modelLoaded = false;
        
        this.init();
    }
    
    init() {
        // Créer un mesh temporaire invisible pour la position du joueur
        const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x00FF00, transparent: true, opacity: 0 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        // Charger le modèle GLB
        const loader = new THREE.GLTFLoader();
        loader.load('./sample.glb', (gltf) => {
            this.model = gltf.scene;
            
            // Ajuster l'échelle - AUGMENTÉE
            this.model.scale.set(1.5, 1.5, 1.5);
            
            // Positionner le modèle correctement
            this.model.position.y = 0;
            
            // Faire pivoter le modèle pour qu'il regarde dans la bonne direction
            this.model.rotation.y = Math.PI;
            
            // Ajouter le modèle comme enfant du mesh pour qu'il suive les mouvements
            this.mesh.add(this.model);
            
            // Activer les ombres et améliorer la luminosité du modèle
            this.model.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    
                    // Rendre les matériaux plus lumineux
                    if (object.material) {
                        // Ajuster la luminosité des matériaux
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => this.brightenMaterial(mat));
                        } else {
                            this.brightenMaterial(object.material);
                        }
                    }
                }
            });
            
            this.modelLoaded = true;
            console.log('Modèle 3D chargé avec succès!');
        }, 
        // Fonction de progression
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% chargé');
        },
        // Gestion des erreurs
        (error) => {
            console.error('Erreur lors du chargement du modèle:', error);
            // En cas d'échec, utiliser le modèle de secours
            this.createFallbackModel();
        });
    }
    
    // Nouvelle méthode pour augmenter la luminosité d'un matériau
    brightenMaterial(material) {
        // Augmenter la luminosité du matériau
        material.emissive = new THREE.Color(0x333333); // Ajouter une légère émission de lumière
        material.emissiveIntensity = 0.5; // Intensité de l'émission
        
        // Réduire l'influence des ombres
        material.shadowSide = THREE.FrontSide;
        
        // Si le matériau a une couleur, la rendre légèrement plus claire
        if (material.color) {
            // Éclaircir légèrement la couleur d'origine
            const color = material.color.clone();
            color.r = Math.min(1, color.r * 1.3);
            color.g = Math.min(1, color.g * 1.3);
            color.b = Math.min(1, color.b * 1.3);
            material.color = color;
        }
        
        // Augmenter la luminosité générale
        if (material.toneMapped !== undefined) {
            material.toneMapped = false; // Désactiver le tone mapping pour des couleurs plus éclatantes
        }
        
        // Mettre à jour le matériau
        material.needsUpdate = true;
    }
    
    createFallbackModel() {
        console.log('Création du modèle de secours');
        
        // Ajouter un modèle visuel pour le joueur (tête visible en 3ème personne)
        const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA07A });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.65; // En haut du "corps"
        this.mesh.add(head);
        
        // Ajouter un corps
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 32);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0; // Au milieu du mesh
        this.mesh.add(body);
        
        // Ajouter des bras
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA07A });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(0.35, 0.2, 0);
        leftArm.rotation.z = Math.PI / 2;
        this.mesh.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-0.35, 0.2, 0);
        rightArm.rotation.z = -Math.PI / 2;
        this.mesh.add(rightArm);
        
        // Ajouter des jambes
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x000080 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.15, -0.5, 0);
        this.mesh.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.15, -0.5, 0);
        this.mesh.add(rightLeg);
    }
    
    calculateNextPosition(delta, moveForward, moveBackward, moveLeft, moveRight) {
        // Réinitialiser la vélocité
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Calculer la direction du mouvement
        this.direction.z = Number(moveForward) - Number(moveBackward);
        this.direction.x = Number(moveRight) - Number(moveLeft);
        this.direction.normalize();
        
        // Récupérer l'angle de rotation du joueur
        const angle = this.mesh.rotation.y;
        
        // Déplacer dans la direction où le joueur regarde
        if (moveForward || moveBackward) {
            this.velocity.z = this.direction.z * this.moveSpeed * Math.cos(angle);
            this.velocity.x = this.direction.z * this.moveSpeed * Math.sin(angle);
        }
        
        // Déplacements latéraux perpendiculaires à la direction de vision
        if (moveLeft || moveRight) {
            this.velocity.z += -this.direction.x * this.moveSpeed * Math.sin(angle);
            this.velocity.x += this.direction.x * this.moveSpeed * Math.cos(angle);
        }
        
        // Calculer la nouvelle position sans l'appliquer
        return new THREE.Vector3(
            this.mesh.position.x + this.velocity.x * delta,
            this.mesh.position.y,
            this.mesh.position.z + this.velocity.z * delta
        );
    }
    
    applyMovement(newPosition) {
        this.mesh.position.copy(newPosition);
    }
    
    update(delta, moveForward, moveBackward, moveLeft, moveRight) {
        const newPosition = this.calculateNextPosition(delta, moveForward, moveBackward, moveLeft, moveRight);
        this.applyMovement(newPosition);
    }
    
    getPosition() {
        return this.mesh.position;
    }
    
    getRotation() {
        return this.mesh.rotation;
    }
    
    setRotationY(y) {
        this.mesh.rotation.y = y;
    }
    
    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.mesh.quaternion);
        return direction;
    }
}
