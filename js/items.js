class ItemManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.items = [];
        this.inventoryItems = {
            filter: false,
            paper: false,
            tobacco: false,
            taga: false
        };
        this.depositedItems = {
            filter: false,
            paper: false,
            tobacco: false,
            taga: false
        };
        this.interactionDistance = 2;
        this.cigaretteCount = 0; // Compteur de cigarettes
        this.terrainSize = 40; // Taille du terrain jouable (en unités)
        this.minDistanceBetweenItems = 5; // Distance minimale entre les objets
        this.cigaretteBeingCreated = false; // Flag pour prévenir l'apparition d'items pendant la création
        
        // Propriétés pour la cigarette qu'on fume
        this.smokingCigarette = null;
        this.isSmoking = false;
        this.smokeParticles = [];
        this.smokeSystem = null;
        this.cigaretteLength = 0.4; // Longueur initiale de la cigarette
        this.consumptionRate = 0.02; // Taux de consommation par seconde
        this.lastSmokeTime = 0;
        this.smokeInterval = 300; // Intervalle entre les émissions de fumée en ms
        
        this.init();
        this.createCigaretteCounter(); // Initialiser le compteur de cigarettes

        // Ajouter une référence au jeu global
        if (window.game) {
            this.game = window.game;
        }
    }
    
    init() {
        // Ne rien faire si une cigarette est en cours de création
        if (this.cigaretteBeingCreated) {
            console.log("Attente de la fin de la création de la cigarette avant de faire apparaître de nouveaux objets.");
            return;
        }

        // Supprimer les anciens objets
        for (const item of this.items) {
            if (item.parent) {
                this.scene.remove(item);
            }
        }
        this.items = [];
        
        // Créer les objets à collecter avec des positions aléatoires
        this.createItem('filter', this.getRandomPosition(), 0xFFFFFF);
        this.createItem('paper', this.getRandomPosition(), 0xF5F5DC);
        this.createItem('tobacco', this.getRandomPosition(), 0x8B4513);
        this.createItem('taga', this.getRandomPosition(), 0xA52A2A);
        
        // Mettre à jour l'interface utilisateur
        this.updateUI();
    }
    
    // Nouvelle méthode pour obtenir une position aléatoire valide
    getRandomPosition() {
        let position;
        let isValidPosition = false;
        let attempts = 0;
        const maxAttempts = 100; // Éviter une boucle infinie
        
        while (!isValidPosition && attempts < maxAttempts) {
            // Générer une position aléatoire dans les limites du terrain
            const x = (Math.random() * this.terrainSize) - (this.terrainSize / 2);
            const z = (Math.random() * this.terrainSize) - (this.terrainSize / 2);
            position = new THREE.Vector3(x, 1, z);
            
            // Vérifier si cette position est assez éloignée des autres objets
            isValidPosition = this.checkPositionValidity(position);
            attempts++;
        }
        
        if (!isValidPosition) {
            console.warn("N'a pas pu trouver une position valide après " + maxAttempts + " tentatives. Utilisation de la dernière position générée.");
        }
        
        return position;
    }
    
    // Vérifier si la position est valide (assez éloignée des autres objets)
    checkPositionValidity(position) {
        // Vérifier la distance avec les autres objets déjà créés
        for (const item of this.items) {
            if (position.distanceTo(item.position) < this.minDistanceBetweenItems) {
                return false;
            }
        }
        
        // Vérifier si la position est dans une zone jouable
        // On pourrait ajouter ici des vérifications par rapport aux obstacles du jeu
        // si on a accès aux colliders de la classe Game
        
        return true;
    }
    
    createItem(type, position, color) {
        let geometry;
        
        switch(type) {
            case 'filter':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
                break;
            case 'paper':
                // Changer l'orientation de la géométrie pour qu'elle soit plus haute que large
                geometry = new THREE.BoxGeometry(0.5, 0.7, 0.01);
                break;
            case 'tobacco':
                geometry = new THREE.PlaneGeometry(0.8, 0.8);
                break;
            case 'taga': // Ajout de la géométrie pour le taga
                geometry = new THREE.PlaneGeometry(0.6, 0.6);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        }
        
        const textureLoader = new THREE.TextureLoader();
        let material;
        switch(type) {
            case 'filter':
                material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
                break;
            case 'paper':
                // Augmenter l'opacité pour rendre le papier plus visible
                material = new THREE.MeshStandardMaterial({ color: 0x808080, transparent: true, opacity: 0.8 });
                break;
            case 'tobacco':
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF,  
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0,
                    alphaTest: 0.01
                });
                
                textureLoader.load(
                    './tabac.png',
                    function(texture) {
                        console.log('Texture tabac chargée avec succès');
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(1, 1);
                        
                        material.map = texture;
                        material.needsUpdate = true;
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% de la texture tabac chargée');
                    },
                    function(error) {
                        console.error('Erreur lors du chargement de la texture tabac:', error);
                    }
                );
                break;
            case 'taga': // Ajout du matériau pour le taga
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF,  
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0,
                    alphaTest: 0.01
                });
                
                textureLoader.load(
                    './taga.png', // Charger la texture taga.png
                    function(texture) {
                        console.log('Texture taga chargée avec succès');
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(1, 1);
                        
                        material.map = texture;
                        material.needsUpdate = true;
                    },
                    function(xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% de la texture taga chargée');
                    },
                    function(error) {
                        console.error('Erreur lors du chargement de la texture taga:', error);
                    }
                );
                break;
            default:
                material = new THREE.MeshStandardMaterial({ color: color });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.userData = { type: type, collectable: true };
        
        // Position verticale pour le tabac et le taga
        if (type === 'tobacco' || type === 'taga') {
            mesh.position.y += 0.5;
        } else if (type === 'paper') {
            // Surélever le papier pour qu'il soit bien visible
            mesh.position.y += 0.5;
            // Ajuster la rotation pour qu'il soit vertical
            mesh.rotation.y = Math.PI / 4; // Rotation de 45 degrés pour être visible de plusieurs angles
        }
        
        this.scene.add(mesh);
        this.items.push(mesh);
        
        // Utiliser la même animation pour tous les objets
        this.animateItem(mesh);
    }
    
    animateItem(item) {
        const animate = () => {
            if (item.parent !== null) { // S'assurer que l'objet est toujours dans la scène
                item.rotation.y += 0.01;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    checkInteraction() {
        const playerPosition = this.player.getPosition();
        const playerDirection = this.player.getDirection();
        
        // Vérifier l'interaction avec les objets collectables
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            
            if (item.userData.collectable) {
                const distance = playerPosition.distanceTo(item.position);
                
                if (distance < this.interactionDistance) {
                    // Vérifier si le joueur regarde vers l'objet
                    const itemDirection = new THREE.Vector3().subVectors(item.position, playerPosition).normalize();
                    const dot = itemDirection.dot(playerDirection);
                    
                    if (dot > 0.5) { // Angle d'environ 60 degrés ou moins
                        this.collectItem(item, i);
                        return; // Important de sortir après avoir collecté un objet
                    }
                }
            }
        }
        
        // Vérifier si le joueur est près de la table et regarde vers elle
        if (this.game && this.game.depositZonePosition) {
            const depositZonePosition = this.game.depositZonePosition;
            const distance = playerPosition.distanceTo(depositZonePosition);
            
            console.log("Distance à la table:", distance);
            
            if (distance < this.interactionDistance * 2) { // Augmenter la zone d'interaction
                // Direction vers la table
                const tableDirection = new THREE.Vector3()
                    .subVectors(depositZonePosition, playerPosition)
                    .normalize();
                
                // Vérifier si le joueur regarde vers la table
                const dot = tableDirection.dot(playerDirection);
                console.log("Angle vers la table:", dot);
                
                if (dot > 0.3) { // Angle plus large pour faciliter l'interaction
                    console.log("Interaction avec la table détectée");
                    
                    // Vérification explicite de tous les dépôts
                    console.log("État des dépôts:", this.depositedItems);
                    const allDeposited = this.hasAllDeposits();
                    console.log("Tous les objets déposés:", allDeposited);
                    
                    // Si tous les objets sont déjà déposés, assembler la cigarette
                    if (allDeposited) {
                        console.log("Tous les objets sont déposés, lancement de l'assemblage");
                        this.assembleCigarette();
                    } else {
                        console.log("Dépôt d'objet sur la table");
                        this.depositItems();
                    }
                    return;
                }
            }
        } else {
            console.log("game ou depositZonePosition non défini:", this.game, this.game?.depositZonePosition);
        }
    }
    
    // Nouvelle méthode pour déposer les objets dans la zone de dépôt
    depositItems() {
        let deposited = false;
        
        // Parcourir tous les objets dans l'inventaire
        for (const type in this.inventoryItems) {
            if (this.inventoryItems[type] && !this.depositedItems[type]) {
                this.depositedItems[type] = true;
                this.inventoryItems[type] = false; // Retirer de l'inventaire
                deposited = true;
                
                // Créer une représentation visuelle de l'objet déposé sur la table
                this.createDepositVisual(type);
                
                // Afficher un message pour l'objet déposé
                this.showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} déposé sur la table!`);
                
                // Mettre à jour l'UI après chaque dépôt
                this.updateUI();
                this.updateDepositUI();
                
                // Sortir après avoir déposé un seul objet (pour que le joueur dépose un par un)
                break;
            }
        }
        
        // Si un objet a été déposé, vérifier si tous les objets sont déposés
        if (deposited && this.hasAllDeposits()) {
            // Ajouter un délai pour laisser le joueur assembler manuellement
            setTimeout(() => {
                this.showMessage("Tous les objets déposés! Appuyez sur E près de la table pour rouler une cigarette.");
            }, 1000);
        }
    }
    
    // Créer une représentation visuelle de l'objet déposé sur la table
    createDepositVisual(type) {
        if (!window.game || !window.game.depositZonePosition) return;
        
        // Récupérer la position de la zone de dépôt
        const zonePos = window.game.depositZonePosition.clone();
        
        // Calculer une position aléatoire près du centre de la table
        const offsetX = (Math.random() - 0.5) * 0.8;
        const offsetZ = (Math.random() - 0.5) * 0.8;
        
        // Textureloader pour charger toutes les textures
        const textureLoader = new THREE.TextureLoader();
        
        // Créer la géométrie et le matériau en fonction du type d'objet
        let geometry, material;
        const tableHeight = 0.1; // Hauteur au-dessus de la table
        
        switch(type) {
            case 'filter':
                geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF,
                    roughness: 0.7,
                    metalness: 0.1
                });
                break;
                
            case 'paper':
                geometry = new THREE.BoxGeometry(0.4, 0.02, 0.5);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xF0F0F0,
                    roughness: 0.5,
                    metalness: 0.1
                });
                break;
                
            case 'tobacco':
                geometry = new THREE.PlaneGeometry(0.4, 0.4);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0,
                    alphaTest: 0.01
                });
                
                // Charger la texture du tabac
                textureLoader.load('./tabac.png', (texture) => {
                    console.log('Texture tabac chargée pour la table');
                    material.map = texture;
                    material.needsUpdate = true;
                });
                break;
                
            case 'taga':
                geometry = new THREE.PlaneGeometry(0.3, 0.3);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0,
                    alphaTest: 0.01
                });
                
                // Charger la texture du taga
                textureLoader.load('./taga.png', (texture) => {
                    console.log('Texture taga chargée pour la table');
                    material.map = texture;
                    material.needsUpdate = true;
                });
                break;
                
            default:
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                material = new THREE.MeshStandardMaterial({ color: 0xAAAAAA });
        }
        
        const visualObject = new THREE.Mesh(geometry, material);
        visualObject.position.set(
            zonePos.x + offsetX, 
            zonePos.y + tableHeight, 
            zonePos.z + offsetZ
        );
        visualObject.castShadow = true;
        visualObject.receiveShadow = true;
        visualObject.userData = { isDepositVisual: true, type: type };
        
        // Ajuster la rotation pour certains objets
        if (type === 'tobacco' || type === 'taga') {
            // Rotation horizontale pour que les textures des planaires soient visibles
            visualObject.rotation.x = -Math.PI / 2;
        } else if (type === 'paper') {
            // Léger angle pour le papier
            visualObject.rotation.y = Math.PI / 6;
        }
        
        this.scene.add(visualObject);
    }
    
    // Vérifier s'il y a une interaction avec la table de dépôt (pour assembler la cigarette)
    checkTableAssembly() {
        if (!this.hasAllDeposits() || !window.game || !window.game.depositZonePosition) {
            return false;
        }
        
        const playerPosition = this.player.getPosition();
        const tablePosition = window.game.depositZonePosition.clone();
        tablePosition.y = 0; // Ajuster pour la hauteur du joueur
        
        const distance = playerPosition.distanceTo(tablePosition);
        
        if (distance < this.interactionDistance * 1.5) {
            // Le joueur est assez proche pour assembler
            return true;
        }
        
        return false;
    }
    
    // Méthode pour l'assemblage manuel de la cigarette
    assembleCigarette() {
        console.log("Méthode assembleCigarette appelée");
        
        if (!this.hasAllDeposits()) {
            this.showMessage("Vous devez d'abord déposer tous les objets sur la table!");
            console.log("Tous les objets ne sont pas déposés:", this.depositedItems);
            return;
        }
        
        console.log("Début de l'animation de roulage");
        
        try {
            // Supprimer les objets visuels de la table 
            this.removeDepositVisuals();
            
            // Lancer l'animation visuelle 3D en première personne
            this.startRollingVisualAnimation();
        } catch (error) {
            console.error("Erreur lors de l'assemblage:", error);
            this.showMessage("Une erreur s'est produite lors de la création de la cigarette.");
        }
    }
    
    // Nouvelle méthode pour créer l'animation visuelle de roulage en 3D
    startRollingVisualAnimation() {
        console.log("Démarrage de l'animation visuelle 3D");
        
        // Créer un groupe pour contenir tous les éléments de l'animation
        const animationGroup = new THREE.Group();
        animationGroup.name = "cigaretteAnimation";
        
        // Position devant la caméra du joueur
        const camera = this.game.cameraManager.getActiveCamera();
        
        // Définir les objets 3D pour l'animation
        this.animationObjects = {
            hands: null,
            paper: null,
            tobacco: null,
            filter: null,
            taga: null,
            cigarette: null
        };
        
        // Créer les mains stylisées
        this.createHands(animationGroup);
        
        // Créer les objets à manipuler
        this.createAnimationItems(animationGroup);
        
        // Ajouter le groupe à la scène
        this.scene.add(animationGroup);
        
        // Positionner le groupe devant la caméra
        this.updateAnimationPosition();
        
        // Désactiver les contrôles du joueur pendant l'animation
        this.disablePlayerControls();
        
        // Démarrer la séquence d'animation
        this.playRollingAnimationSequence(0);
    }
    
    // Création des mains stylisées pour l'animation
    createHands(group) {
        // Main gauche
        const leftHandGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.5);
        const handMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD0B0 });
        const leftHand = new THREE.Mesh(leftHandGeometry, handMaterial);
        leftHand.position.set(-0.3, -0.5, -0.8);
        leftHand.name = "leftHand";
        
        // Main droite
        const rightHandGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.5);
        const rightHand = new THREE.Mesh(rightHandGeometry, handMaterial);
        rightHand.position.set(0.3, -0.5, -0.8);
        rightHand.name = "rightHand";
        
        // Ajouter les mains au groupe
        group.add(leftHand);
        group.add(rightHand);
        
        this.animationObjects.hands = { left: leftHand, right: rightHand };
    }
    
    // Création des objets à manipuler pendant l'animation
    createAnimationItems(group) {
        // Créer le papier à cigarette
        const paperGeometry = new THREE.PlaneGeometry(0.4, 0.2);
        const paperMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF0F0F0, 
            transparent: true, 
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const paper = new THREE.Mesh(paperGeometry, paperMaterial);
        paper.position.set(0, -1, -1); // Position initiale hors vue
        paper.name = "rollingPaper";
        group.add(paper);
        this.animationObjects.paper = paper;
        
        // Créer le tabac
        const tobaccoGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const textureLoader = new THREE.TextureLoader();
        const tobaccoMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        // Charger la texture du tabac
        textureLoader.load('./tabac.png', (texture) => {
            tobaccoMaterial.map = texture;
            tobaccoMaterial.needsUpdate = true;
        });
        
        const tobacco = new THREE.Mesh(tobaccoGeometry, tobaccoMaterial);
        tobacco.position.set(0.5, -1, -1); // Position initiale hors vue
        tobacco.name = "tobacco";
        group.add(tobacco);
        this.animationObjects.tobacco = tobacco;
        
        // Créer le filtre
        const filterGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 16);
        const filterMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const filter = new THREE.Mesh(filterGeometry, filterMaterial);
        filter.position.set(-0.5, -1, -1); // Position initiale hors vue
        filter.name = "filter";
        group.add(filter);
        this.animationObjects.filter = filter;
        
        // Créer le taga
        const tagaGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const tagaMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        // Charger la texture du taga
        textureLoader.load('./taga.png', (texture) => {
            tagaMaterial.map = texture;
            tagaMaterial.needsUpdate = true;
        });
        
        const taga = new THREE.Mesh(tagaGeometry, tagaMaterial);
        taga.position.set(0, -1, -1); // Position initiale hors vue
        taga.name = "taga";
        group.add(taga);
        this.animationObjects.taga = taga;
        
        // Préparer la cigarette finale (initialement invisible)
        const cigaretteGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16);
        const cigaretteMaterial = new THREE.MeshStandardMaterial({ color: 0xE8D598 });
        const cigarette = new THREE.Mesh(cigaretteGeometry, cigaretteMaterial);
        cigarette.position.set(0, -1, -1); // Position initiale hors vue
        cigarette.name = "cigarette";
        cigarette.visible = false;
        group.add(cigarette);
        this.animationObjects.cigarette = cigarette;
    }
    
    // Mise à jour de la position du groupe d'animation pour suivre la caméra
    updateAnimationPosition() {
        const camera = this.game.cameraManager.getActiveCamera();
        const animationGroup = this.scene.getObjectByName("cigaretteAnimation");
        
        if (animationGroup && camera) {
            // Calculer la position devant la caméra
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            
            // Positionner le groupe d'animation devant la caméra
            animationGroup.position.copy(camera.position);
            animationGroup.quaternion.copy(camera.quaternion);
        }
    }
    
    // Désactiver les contrôles du joueur pendant l'animation
    disablePlayerControls() {
        if (this.game) {
            this.game.animationInProgress = true;
            this.game.moveForward = false;
            this.game.moveBackward = false;
            this.game.moveLeft = false;
            this.game.moveRight = false;
        }
    }
    
    // Réactiver les contrôles du joueur après l'animation
    enablePlayerControls() {
        if (this.game) {
            this.game.animationInProgress = false;
        }
    }
    
    // Séquence d'animation visuelle du roulage
    playRollingAnimationSequence(step) {
        // Mettre à jour la position de l'animation à chaque étape
        this.updateAnimationPosition();
        
        if (step >= this.animationSteps.length) {
            this.finalizeVisualRolling();
            return;
        }
        
        const currentStep = this.animationSteps[step];
        console.log(`Animation étape ${step + 1}/${this.animationSteps.length}: ${currentStep.name}`);
        
        // Exécuter l'étape d'animation actuelle
        if (typeof currentStep.action === 'function') {
            currentStep.action.call(this);
        }
        
        // Afficher un message descriptif de l'étape
        if (currentStep.message) {
            this.showMessage(currentStep.message);
        }
        
        // Passer à l'étape suivante après le délai
        setTimeout(() => {
            this.playRollingAnimationSequence(step + 1);
        }, currentStep.duration);
    }
    
    // Définition des étapes d'animation
    get animationSteps() {
        return [
            {
                name: "takePaper",
                duration: 1500,
                message: "Vous sortez une feuille à rouler...",
                action: function() {
                    // Mettre le papier dans la main
                    const paper = this.animationObjects.paper;
                    const leftHand = this.animationObjects.hands.left;
                    
                    paper.position.set(0, -0.3, -0.7);
                    paper.rotation.x = -Math.PI / 4;
                    paper.visible = true;
                }
            },
            {
                name: "preparePaper",
                duration: 1500,
                message: "Vous placez la feuille entre vos doigts...",
                action: function() {
                    // Positionner le papier horizontalement
                    const paper = this.animationObjects.paper;
                    paper.position.set(0, -0.4, -0.6);
                    paper.rotation.x = -Math.PI / 2;
                    
                    // Déplacer les mains
                    const leftHand = this.animationObjects.hands.left;
                    const rightHand = this.animationObjects.hands.right;
                    leftHand.position.set(-0.2, -0.4, -0.6);
                    rightHand.position.set(0.2, -0.4, -0.6);
                }
            },
            {
                name: "takeTobacco",
                duration: 1500,
                message: "Vous prenez votre tabac...",
                action: function() {
                    // Faire apparaître le tabac
                    const tobacco = this.animationObjects.tobacco;
                    tobacco.position.set(0.3, -0.2, -0.5);
                    tobacco.visible = true;
                    
                    // Déplacer la main droite
                    const rightHand = this.animationObjects.hands.right;
                    rightHand.position.set(0.3, -0.3, -0.5);
                }
            },
            {
                name: "placeTobacco",
                duration: 2000,
                message: "Vous disposez le tabac sur la feuille...",
                action: function() {
                    // Déplacer le tabac vers le papier
                    const tobacco = this.animationObjects.tobacco;
                    tobacco.position.set(0, -0.39, -0.6);
                    tobacco.scale.set(0.7, 0.7, 0.7);
                    
                    // Repositionner les mains
                    const rightHand = this.animationObjects.hands.right;
                    rightHand.position.set(0.2, -0.4, -0.6);
                }
            },
            {
                name: "takeTaga",
                duration: 1500,
                message: "Vous ajoutez une pincée de taga...",
                action: function() {
                    // Faire apparaître le taga
                    const taga = this.animationObjects.taga;
                    taga.position.set(-0.3, -0.2, -0.5);
                    taga.visible = true;
                    
                    // Déplacer la main gauche
                    const leftHand = this.animationObjects.hands.left;
                    leftHand.position.set(-0.3, -0.3, -0.5);
                }
            },
            {
                name: "placeTaga",
                duration: 1500,
                message: "Vous la répartissez sur le tabac...",
                action: function() {
                    // Déplacer le taga vers le tabac
                    const taga = this.animationObjects.taga;
                    taga.position.set(0, -0.38, -0.6);
                    taga.scale.set(0.5, 0.5, 0.5);
                    
                    // Repositionner les mains
                    const leftHand = this.animationObjects.hands.left;
                    leftHand.position.set(-0.2, -0.4, -0.6);
                }
            },
            {
                name: "startRolling",
                duration: 2000,
                message: "Vous commencez à rouler...",
                action: function() {
                    // Déplacer les mains pour commencer à rouler
                    const leftHand = this.animationObjects.hands.left;
                    const rightHand = this.animationObjects.hands.right;
                    leftHand.position.set(-0.15, -0.4, -0.6);
                    rightHand.position.set(0.15, -0.4, -0.6);
                    
                    // Le papier commence à s'enrouler (réduction de la taille)
                    const paper = this.animationObjects.paper;
                    paper.scale.set(0.9, 0.9, 0.9);
                    
                    // Le tabac et le taga disparaissent progressivement
                    const tobacco = this.animationObjects.tobacco;
                    const taga = this.animationObjects.taga;
                    tobacco.visible = false;
                    taga.visible = false;
                }
            },
            {
                name: "continueRolling",
                duration: 2000,
                message: "Vous formez un cylindre régulier...",
                action: function() {
                    // Modifier la géométrie du papier pour qu'il ressemble de plus en plus à un cylindre
                    const paper = this.animationObjects.paper;
                    
                    // Créer un nouveau cylindre qui remplacera progressivement le papier
                    const cylinderGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
                    const cylinderMaterial = new THREE.MeshStandardMaterial({ 
                        color: 0xF0F0F0,
                        transparent: true,
                        opacity: 0.9
                    });
                    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
                    cylinder.rotation.x = Math.PI / 2;
                    cylinder.position.copy(paper.position);
                    
                    // Remplacer le papier par le cylindre
                    const animationGroup = this.scene.getObjectByName("cigaretteAnimation");
                    animationGroup.remove(paper);
                    animationGroup.add(cylinder);
                    
                    // Mettre à jour la référence
                    this.animationObjects.paper = cylinder;
                    
                    // Rapprocher les mains
                    const leftHand = this.animationObjects.hands.left;
                    const rightHand = this.animationObjects.hands.right;
                    leftHand.position.set(-0.1, -0.4, -0.6);
                    rightHand.position.set(0.1, -0.4, -0.6);
                }
            },
            {
                name: "addFilter",
                duration: 1500,
                message: "Vous insérez le filtre...",
                action: function() {
                    // Faire apparaître le filtre
                    const filter = this.animationObjects.filter;
                    filter.position.set(-0.2, -0.4, -0.6);
                    filter.rotation.x = Math.PI / 2;
                    filter.visible = true;
                    
                    // Déplacer la main gauche
                    const leftHand = this.animationObjects.hands.left;
                    leftHand.position.set(-0.2, -0.4, -0.6);
                }
            },
            {
                name: "finishRolling",
                duration: 2000,
                message: "Vous léchez le papier et scellez la cigarette...",
                action: function() {
                    // Faire disparaître le filtre (intégré dans la cigarette)
                    const filter = this.animationObjects.filter;
                    filter.visible = false;
                    
                    // Faire apparaître la cigarette complète
                    const cigarette = this.animationObjects.cigarette;
                    cigarette.position.set(0, -0.4, -0.6);
                    cigarette.rotation.x = Math.PI / 2;
                    cigarette.visible = true;
                    
                    // Faire disparaître le papier roulé
                    const paper = this.animationObjects.paper;
                    paper.visible = false;
                    
                    // Repositionner les mains
                    const leftHand = this.animationObjects.hands.left;
                    const rightHand = this.animationObjects.hands.right;
                    leftHand.position.set(-0.1, -0.4, -0.6);
                    rightHand.position.set(0.1, -0.4, -0.6);
                }
            },
            {
                name: "admireResult",
                duration: 2000,
                message: "Votre cigarette est prête!",
                action: function() {
                    // Élever la cigarette pour l'admirer
                    const cigarette = this.animationObjects.cigarette;
                    cigarette.position.set(0, -0.3, -0.6);
                    
                    // Repositionner les mains
                    const leftHand = this.animationObjects.hands.left;
                    const rightHand = this.animationObjects.hands.right;
                    leftHand.position.set(-0.1, -0.3, -0.6);
                    rightHand.position.set(0.1, -0.3, -0.6);
                }
            }
        ];
    }
    
    // Finaliser l'animation de roulage visuelle
    finalizeVisualRolling() {
        console.log("Animation visuelle terminée");
        
        // Supprimer le groupe d'animation
        const animationGroup = this.scene.getObjectByName("cigaretteAnimation");
        if (animationGroup) {
            this.scene.remove(animationGroup);
        }
        
        // Réactiver les contrôles du joueur
        this.enablePlayerControls();
        
        // Finaliser la création de cigarette
        this.cigaretteCount++;
        this.updateCigaretteCounter();
        this.showMessage(`Félicitations! Vous avez roulé une cigarette! Total: ${this.cigaretteCount}`);
        
        // Créer un modèle 3D de cigarette sur la table
        if (this.game.depositZonePosition) {
            const loader = new THREE.GLTFLoader();
            loader.load('./cigarette.glb', (gltf) => {
                const cigaretteModel = gltf.scene;
                cigaretteModel.position.copy(this.game.depositZonePosition);
                cigaretteModel.position.y += 0.1;
                this.scene.add(cigaretteModel);
                
                // Supprimer la cigarette après quelques secondes
                setTimeout(() => {
                    this.scene.remove(cigaretteModel);
                }, 3000);
            }, undefined, (error) => {
                console.error("Erreur lors du chargement de la cigarette:", error);
            });
        }
        
        // Réinitialiser les dépôts
        for (let key in this.depositedItems) {
            this.depositedItems[key] = false;
        }
        
        // Mettre à jour l'UI des dépôts
        this.updateDepositUI();
        
        // Préparer de nouveaux objets à collecter
        this.cigaretteBeingCreated = true;
        setTimeout(() => {
            this.cigaretteBeingCreated = false;
            this.init();
        }, 2000);
    }
    
    // Méthode pour supprimer les objets visuels de la table
    removeDepositVisuals() {
        console.log("Suppression des objets visuels de la table");
        
        // Parcourir la scène et supprimer les objets visuels de dépôt
        const objectsToRemove = [];
        
        this.scene.traverse(object => {
            if (object.userData && object.userData.isDepositVisual) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            console.log(`Suppression de l'objet visuel de type: ${object.userData.type}`);
            this.scene.remove(object);
        });
        
        console.log(`${objectsToRemove.length} objets visuels supprimés de la table`);
    }
    
    // Nouvelle méthode pour l'animation de roulage de cigarette
    startRollingAnimation() {
        console.log("Animation de roulage démarrée");
        
        // Créer/obtenir l'élément pour l'animation
        let animEl = document.getElementById('rolling-animation');
        if (!animEl) {
            animEl = document.createElement('div');
            animEl.id = 'rolling-animation';
            animEl.style.position = 'fixed';
            animEl.style.top = '50%';
            animEl.style.left = '50%';
            animEl.style.transform = 'translate(-50%, -50%)';
            animEl.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            animEl.style.color = 'white';
            animEl.style.padding = '25px';
            animEl.style.borderRadius = '10px';
            animEl.style.fontSize = '20px';
            animEl.style.fontWeight = 'normal';
            animEl.style.lineHeight = '1.6';
            animEl.style.textAlign = 'center';
            animEl.style.zIndex = '2000';
            animEl.style.width = '70%';
            animEl.style.maxWidth = '800px';
            animEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
            animEl.style.display = 'block'; // Assurez-vous que l'élément est affiché
            animEl.style.opacity = '0';
            document.body.appendChild(animEl);
        } else {
            // Si l'élément existe déjà, assurez-vous qu'il est visible
            animEl.style.display = 'block';
        }
        
        // Définir les étapes de l'animation selon la description fournie
        const animationSteps = [
            // ...existing steps array...
            {
                text: "Vous sortez un paquet de feuilles à rouler et en détachez délicatement une.",
                delay: 2500,
                image: './textures/paper.jpg'
            },
            {
                text: "Vous placez la feuille entre vos doigts, face collante vers le haut.",
                delay: 2500
            },
            {
                text: "Vous saisissez votre paquet de tabac, l'ouvrez avec précaution.",
                delay: 2500,
                image: './tabac.png'
            },
            {
                text: "Entre vos doigts, vous effrittez une petite quantité de tabac pour l'aérer.",
                delay: 3000
            },
            {
                text: "Avec des gestes précis, vous disposez le tabac délicatement au centre de la feuille, veillant à une répartition uniforme.",
                delay: 3500
            },
            {
                text: "D'un geste plus discret, vous ajoutez une pincée de « taga », cette mystérieuse poudre...",
                delay: 3000,
                image: './taga.png'
            },
            {
                text: "Vous la répartissez soigneusement sur le tabac, assurant un mélange homogène.",
                delay: 2500
            },
            {
                text: "Avec vos pouces et index, vous commencez à rouler la feuille pour former un cylindre.",
                delay: 3000
            },
            {
                text: "Vos doigts travaillent avec précision, façonnant un cylindre parfaitement régulier.",
                delay: 3000
            },
            {
                text: "Une fois la forme bien tenue, vous léchez légèrement la bande collante...",
                delay: 2500
            },
            {
                text: "... et refermez la cigarette d'un geste fluide et assuré.",
                delay: 2500
            },
            {
                text: "Enfin, vous tapotez légèrement les extrémités pour tasser le contenu.",
                delay: 2500
            },
            {
                text: "Et voilà! Votre cigarette est prête, parfaitement roulée.",
                delay: 2500,
                isLast: true
            }
        ];
        
        // Jouer une musique d'ambiance pendant l'animation (optionnel)
        this.playRollingBackgroundMusic();
        
        // Lancer la séquence d'animation avec un délai court pour permettre le rendu
        setTimeout(() => {
            console.log("Animation rendue visible");
            animEl.style.opacity = '1';
            animEl.style.transition = 'opacity 0.3s ease-in-out';
            this.runAnimationSequence(animationSteps, animEl);
        }, 100);
    }
    
    // Méthode pour jouer la séquence d'animation étape par étape
    runAnimationSequence(steps, animEl, index = 0) {
        if (index >= steps.length) {
            // L'animation est terminée, masquer l'élément et finaliser
            animEl.style.opacity = '0';
            console.log("Animation terminée, finalisation");
            setTimeout(() => {
                animEl.style.display = 'none';
                this.finalizeRolling();
            }, 300);
            return;
        }
        
        const step = steps[index];
        console.log(`Étape d'animation ${index + 1}/${steps.length}: ${step.text.substring(0, 30)}...`);
        
        // Préparer le contenu HTML avec l'image si disponible
        let content = `<p>${step.text}</p>`;
        if (step.image) {
            content += `<div class="animation-image" style="margin-top: 15px;">
                <img src="${step.image}" alt="Illustration" style="max-height: 80px; max-width: 80px;">
            </div>`;
        }
        
        animEl.innerHTML = content;
        
        // Appliquer un style spécial pour la dernière étape
        if (step.isLast) {
            animEl.style.backgroundColor = 'rgba(50, 50, 0, 0.9)';
            animEl.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
        } else {
            animEl.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            animEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        }
        
        // Passer à l'étape suivante après le délai
        setTimeout(() => {
            this.runAnimationSequence(steps, animEl, index + 1);
        }, step.delay);
    }
    
    // Méthode pour finaliser la création de cigarette après l'animation
    finalizeRolling() {
        // Incrémenter le compteur
        this.cigaretteCount++;
        
        // Mettre à jour l'affichage du compteur
        this.updateCigaretteCounter();
        
        // Créer une représentation visuelle de la cigarette assemblée
        this.createCigaretteVisual();
        
        // Afficher un message de succès
        let message = `Cigarette parfaitement roulée! Total: ${this.cigaretteCount}`;
        this.showMessage(message);
        
        // Réinitialiser les dépôts
        for (let key in this.depositedItems) {
            this.depositedItems[key] = false;
        }
        
        // Mettre à jour l'UI des dépôts
        this.updateDepositUI();
        
        // Attendre avant de permettre l'apparition de nouveaux objets
        this.cigaretteBeingCreated = true;
        setTimeout(() => {
            this.cigaretteBeingCreated = false;
            this.init(); // Réinitialiser les objets à collecter
        }, 2000);
        
        // Arrêter la musique d'ambiance si elle a été lancée
        this.stopRollingBackgroundMusic();
    }
    
    // Méthode pour jouer une musique d'ambiance pendant le roulage (optionnel)
    playRollingBackgroundMusic() {
        // Cette fonction pourrait être implémentée si vous souhaitez ajouter de la musique
        console.log("Musique d'ambiance pour le roulage (simulation)");
        // Exemple: const audio = new Audio('./sounds/rolling_ambient.mp3'); audio.play();
    }
    
    // Méthode pour arrêter la musique d'ambiance
    stopRollingBackgroundMusic() {
        // Arrêter la musique si elle a été lancée
        console.log("Arrêt de la musique d'ambiance (simulation)");
    }
    
    collectItem(item, index) {
        const type = item.userData.type;
        
        this.inventoryItems[type] = true;
        this.scene.remove(item);
        this.items.splice(index, 1);
        
        this.updateUI();
        this.showCollectionMessage(type);
        
        // Supprimer la création automatique de cigarette
        // Informer simplement le joueur qu'il doit se rendre à la table
        if (this.hasAllItems()) {
            setTimeout(() => {
                this.showMessage("Vous avez tous les éléments! Allez à la maison pour les déposer sur la table.");
            }, 1000);
        }
    }
    
    showCollectionMessage(type) {
        let message;
        switch(type) {
            case 'filter':
                message = "Filtre récupéré!";
                break;
            case 'paper':
                message = "Papier à rouler récupéré!";
                break;
            case 'tobacco':
                message = "Tabac récupéré!";
                break;
            case 'taga':
                message = "Taga récupéré!";
                break;
        }
        
        // Modifié pour indiquer l'étape suivante
        if (this.hasAllItems()) {
            message += " Tous les éléments collectés! Allez à la maison et déposez-les sur la table.";
        }
        
        this.showMessage(message);
    }

    createCigarette() {
        // Incrémenter le compteur
        this.cigaretteCount++;
        
        // Mettre à jour l'affichage du compteur
        this.updateCigaretteCounter();
        
        // Afficher un message
        let message = `Cigarette créée! Total: ${this.cigaretteCount}`;
        this.showMessage(message);
        
        // Réinitialiser l'inventaire
        for (let key in this.inventoryItems) {
            this.inventoryItems[key] = false;
        }
        
        // Mettre à jour l'UI
        this.updateUI();
        
        // Attendre avant de permettre l'apparition de nouveaux items (1 seconde)
        setTimeout(() => {
            this.cigaretteBeingCreated = false; // Réactiver l'apparition d'items
            this.init(); // Réinitialiser les objets à collecter
        }, 1000);
    }
    
    createCigaretteCounter() {
        // Créer un élément pour le compteur
        const counterContainer = document.createElement('div');
        counterContainer.id = 'cigarette-counter';
        counterContainer.style.position = 'fixed';
        counterContainer.style.top = '20px';
        counterContainer.style.right = '20px';
        counterContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        counterContainer.style.color = 'white';
        counterContainer.style.padding = '10px';
        counterContainer.style.borderRadius = '5px';
        counterContainer.style.fontFamily = 'Arial, sans-serif';
        counterContainer.style.fontSize = '18px';
        counterContainer.style.fontWeight = 'bold';
        counterContainer.style.zIndex = '1000';
        counterContainer.style.display = 'flex';
        counterContainer.style.alignItems = 'center';
        counterContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        
        // Ajouter une image de cigarette au lieu d'un emoji
        const cigaretteIcon = document.createElement('img');
        cigaretteIcon.src = './counter.png';
        cigaretteIcon.style.marginRight = '10px';
        cigaretteIcon.style.height = '24px';
        cigaretteIcon.style.width = 'auto';
        cigaretteIcon.style.verticalAlign = 'middle';
        
        // Ajouter le compteur numérique
        const counter = document.createElement('span');
        counter.id = 'cigarette-count';
        counter.textContent = this.cigaretteCount;
        
        // Assembler les éléments
        counterContainer.appendChild(cigaretteIcon);
        counterContainer.appendChild(counter);
        document.body.appendChild(counterContainer);
    }
    
    updateCigaretteCounter() {
        const counter = document.getElementById('cigarette-count');
        if (counter) {
            counter.textContent = this.cigaretteCount;
        }
    }
    
    showMessage(text) {
        let messageEl = document.getElementById('message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'message';
            messageEl.style.position = 'fixed';
            messageEl.style.top = '50%';
            messageEl.style.left = '50%';
            messageEl.style.transform = 'translate(-50%, -50%)';
            messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            messageEl.style.color = 'white';
            messageEl.style.padding = '20px';
            messageEl.style.borderRadius = '5px';
            messageEl.style.fontSize = '24px';
            messageEl.style.fontWeight = 'bold';
            messageEl.style.textAlign = 'center';
            messageEl.style.zIndex = '1001';
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
    
    updateUI() {
        for (const [key, value] of Object.entries(this.inventoryItems)) {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value ? '✓' : '❌'}`;
                if (value) {
                    element.classList.add('collected');
                } else {
                    element.classList.remove('collected');
                }
            }
        }
    }
    
    hasAllItems() {
        return this.inventoryItems.filter && this.inventoryItems.paper && 
               this.inventoryItems.tobacco && this.inventoryItems.taga;
    }
    
    // Mettre à jour l'UI pour montrer les objets déposés
    updateDepositUI() {
        // Créer l'élément d'UI des dépôts s'il n'existe pas
        let depositUI = document.getElementById('deposit-items');
        if (!depositUI) {
            depositUI = document.createElement('div');
            depositUI.id = 'deposit-items';
            depositUI.style.position = 'fixed';
            depositUI.style.bottom = '20px';
            depositUI.style.right = '20px';
            depositUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            depositUI.style.color = 'white';
            depositUI.style.padding = '10px';
            depositUI.style.borderRadius = '5px';
            depositUI.style.zIndex = '1000';
            depositUI.style.fontFamily = 'Arial, sans-serif';
            depositUI.style.fontSize = '16px';
            depositUI.innerHTML = `
                <h3 style="margin: 0 0 5px 0; text-align: center; font-size: 18px;">Objets déposés</h3>
                <div id="deposit-filter" class="deposit-item">Filtre: ❌</div>
                <div id="deposit-paper" class="deposit-item">Papier: ❌</div>
                <div id="deposit-tobacco" class="deposit-item">Tabac: ❌</div>
                <div id="deposit-taga" class="deposit-item">Taga: ❌</div>
            `;
            document.body.appendChild(depositUI);
            
            // Ajouter du style CSS pour les éléments déposés
            const style = document.createElement('style');
            style.textContent = `
                .deposit-item.deposited {
                    color: #4CAF50;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Mettre à jour l'affichage des dépôts
        for (const [key, value] of Object.entries(this.depositedItems)) {
            const element = document.getElementById(`deposit-${key}`);
            if (element) {
                element.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value ? '✓' : '❌'}`;
                if (value) {
                    element.classList.add('deposited');
                } else {
                    element.classList.remove('deposited');
                }
            }
        }
    }

    hasAllDeposits() {
        // Vérifier explicitement chaque élément
        const filterDeposited = this.depositedItems.filter === true;
        const paperDeposited = this.depositedItems.paper === true;
        const tobaccoDeposited = this.depositedItems.tobacco === true;
        const tagaDeposited = this.depositedItems.taga === true;
        
        const result = filterDeposited && paperDeposited && tobaccoDeposited && tagaDeposited;
        
        console.log("Vérification des dépôts:", {
            filter: filterDeposited,
            paper: paperDeposited,
            tobacco: tobaccoDeposited,
            taga: tagaDeposited,
            result: result
        });
        
        return result;
    }

    // Nouvelle méthode pour commencer à fumer une cigarette
    startSmoking() {
        console.log("Début de la consommation de cigarette");
        
        // Vérifier si on a des cigarettes
        if (this.cigaretteCount <= 0) {
            this.showMessage("Vous n'avez pas de cigarette à fumer !");
            return false;
        }
        
        // Si on est déjà en train de fumer, arrêter
        if (this.isSmoking) {
            this.stopSmoking();
            return true;
        }
        
        this.isSmoking = true;
        
        // Créer une cigarette 3D devant le joueur
        this.createSmokingCigarette();
        
        // Créer le système de particules pour la fumée
        this.initSmokeParticles();
        
        // Message d'information
        this.showMessage("Vous allumez une cigarette. Appuyez sur U pour arrêter de fumer.");
        
        return true;
    }
    
    // Créer une cigarette 3D pour l'animation de fumage
    createSmokingCigarette() {
        // Charger le modèle 3D de cigarette si disponible
        const loader = new THREE.GLTFLoader();
        
        // Position de la cigarette devant la caméra
        const camera = this.game.cameraManager.getActiveCamera();
        
        // En attendant que le modèle charge, créer un cylindre simple
        const cylinderGeometry = new THREE.CylinderGeometry(0.03, 0.03, this.cigaretteLength, 16);
        const cigaretteMaterial = new THREE.MeshStandardMaterial({
            color: 0xE8D598,
            roughness: 0.4,
            metalness: 0.1
        });
        
        // Matériau pour la partie brûlante (bout rouge)
        const embersGeometry = new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16);
        const embersMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF3311,
            emissive: 0xFF2200,
            emissiveIntensity: 1.0,
            roughness: 0.5
        });
        
        // Créer le cylindre de cigarette
        this.smokingCigarette = new THREE.Group();
        const cigaretteBody = new THREE.Mesh(cylinderGeometry, cigaretteMaterial);
        cigaretteBody.position.set(0, 0, 0);
        cigaretteBody.rotation.x = Math.PI / 2; // Rotation pour que la cigarette soit horizontale
        
        // Ajouter le bout incandescent à une extrémité
        const embers = new THREE.Mesh(embersGeometry, embersMaterial);
        embers.position.set(0, this.cigaretteLength / 2, 0);
        embers.rotation.x = Math.PI / 2;
        
        this.smokingCigarette.add(cigaretteBody);
        this.smokingCigarette.add(embers);
        
        // Positionner la cigarette
        this.updateCigarettePosition();
        
        this.scene.add(this.smokingCigarette);
        
        // Essayer de charger le modèle GLB plus réaliste
        loader.load('./cigarette.glb', (gltf) => {
            // Si le modèle est chargé avec succès, remplacer notre cigarette simple
            console.log("Modèle de cigarette GLB chargé avec succès");
            
            // Supprimer la cigarette simple
            this.scene.remove(this.smokingCigarette);
            
            // Utiliser le modèle GLB à la place
            this.smokingCigarette = gltf.scene;
            
            // Ajuster la taille et la position
            this.smokingCigarette.scale.set(0.5, 0.5, 0.5); // Ajuster selon le modèle
            
            // Positionner le modèle
            this.updateCigarettePosition();
            
            // Stocker les meshes d'origine pour l'animation de diminution
            this.originalCigaretteMeshes = [];
            this.smokingCigarette.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    this.originalCigaretteMeshes.push({
                        mesh: child,
                        originalGeometry: child.geometry.clone(),
                        originalScale: child.scale.clone()
                    });
                }
            });
            
            this.scene.add(this.smokingCigarette);
        }, undefined, (error) => {
            console.error("Erreur lors du chargement du modèle de cigarette:", error);
            // On garde notre cigarette simple
        });
    }
    
    // Initialiser le système de particules pour la fumée
    initSmokeParticles() {
        // Créer un groupe pour la fumée
        this.smokeSystem = new THREE.Group();
        
        // Créer des particules pour la fumée (on utilisera environ 50 particules)
        const smokeTexture = new THREE.TextureLoader().load('./textures/smoke.png');
        const smokeMaterial = new THREE.SpriteMaterial({
            map: smokeTexture,
            color: 0xAAAAAA,
            transparent: true,
            opacity: 0.7
        });
        
        for (let i = 0; i < 50; i++) {
            const particle = new THREE.Sprite(smokeMaterial.clone());
            particle.scale.set(0.1, 0.1, 0.1);
            particle.position.set(0, 0, 0);
            particle.visible = false; // Initialement invisible
            
            // Propriétés personnalisées pour l'animation
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,  // Vitesse x
                Math.random() * 0.03,          // Vitesse y (vers le haut)
                (Math.random() - 0.5) * 0.01   // Vitesse z
            );
            particle.userData.lifeSpan = 2.0 + Math.random() * 3.0; // Durée de vie en secondes
            particle.userData.age = 0;
            particle.userData.active = false;
            
            this.smokeParticles.push(particle);
            this.smokeSystem.add(particle);
        }
        
        this.scene.add(this.smokeSystem);
        
        // Démarrer l'animation de fumée
        this.animateSmoke();
    }
    
    // Mettre à jour la position de la cigarette (devant la caméra)
    updateCigarettePosition() {
        if (!this.smokingCigarette || !this.game || !this.game.cameraManager) return;
        
        const camera = this.game.cameraManager.getActiveCamera();
        if (!camera) return;
        
        // Position de la cigarette en bas à droite de la vue
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        // Obtenir les vecteurs de la caméra
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        
        // Positionner la cigarette
        this.smokingCigarette.position.copy(camera.position);
        this.smokingCigarette.position.addScaledVector(direction, 0.5);
        this.smokingCigarette.position.addScaledVector(right, 0.2);
        this.smokingCigarette.position.addScaledVector(up, -0.15);
        
        // Orienter la cigarette
        if (this.smokingCigarette.rotation) {
            this.smokingCigarette.quaternion.copy(camera.quaternion);
            // Ajuster l'orientation pour qu'elle soit à l'horizontale
            this.smokingCigarette.rotation.x -= Math.PI / 12;
            this.smokingCigarette.rotation.z -= Math.PI / 8;
        }
    }
    
    // Animer le mouvement de la cigarette (porter à la bouche puis éloigner)
    animateCigarette() {
        if (!this.smokingCigarette || !this.isSmoking) return;
        
        const time = Date.now() * 0.001;
        const puffCycle = (Math.sin(time * 0.5) + 1) / 2; // 0 à 1
        
        // Mouvement de la cigarette vers la bouche
        if (this.smokingCigarette.position && this.game && this.game.cameraManager) {
            const camera = this.game.cameraManager.getActiveCamera();
            
            // Vecteurs de base
            const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            
            // Position de départ (bras tendu)
            const startPos = new THREE.Vector3().copy(camera.position)
                .addScaledVector(direction, 0.5)
                .addScaledVector(right, 0.2)
                .addScaledVector(up, -0.15);
            
            // Position finale (à la bouche)
            const endPos = new THREE.Vector3().copy(camera.position)
                .addScaledVector(direction, 0.3)
                .addScaledVector(right, 0.05)
                .addScaledVector(up, -0.05);
            
            // Position interpolée entre début et fin selon le cycle
            const interpolatedPos = new THREE.Vector3().lerpVectors(startPos, endPos, puffCycle);
            
            // Appliquer la position
            this.smokingCigarette.position.copy(interpolatedPos);
        }
        
        // Émettre de la fumée quand la cigarette est proche de la bouche
        if (puffCycle > 0.8 && Date.now() - this.lastSmokeTime > this.smokeInterval) {
            this.emitSmoke();
            this.lastSmokeTime = Date.now();
        }
    }
    
    // Émettre une nouvelle particule de fumée
    emitSmoke() {
        // Trouver une particule inactive
        const inactiveParticles = this.smokeParticles.filter(p => !p.userData.active);
        
        if (inactiveParticles.length === 0) return;
        
        const particle = inactiveParticles[0];
        
        // Positionner la particule au bout de la cigarette
        if (this.smokingCigarette) {
            // Position du bout de la cigarette
            const cigarettePos = this.smokingCigarette.position.clone();
            const cigaretteDirection = new THREE.Vector3(0, 0, 1);
            cigaretteDirection.applyQuaternion(this.smokingCigarette.quaternion);
            
            // Positionner la particule au bout de la cigarette
            particle.position.copy(cigarettePos);
            particle.position.addScaledVector(cigaretteDirection, this.cigaretteLength / 2);
        }
        
        // Activer la particule
        particle.userData.active = true;
        particle.userData.age = 0;
        particle.visible = true;
        particle.scale.set(0.05, 0.05, 0.05);
        particle.material.opacity = 0.7;
    }
    
    // Animer les particules de fumée
    animateSmoke() {
        if (!this.isSmoking || !this.smokeParticles.length) return;
        
        const delta = 0.016; // ~60fps
        
        // Mettre à jour chaque particule
        for (const particle of this.smokeParticles) {
            if (!particle.userData.active) continue;
            
            particle.userData.age += delta;
            
            // Si la particule a dépassé sa durée de vie, la désactiver
            if (particle.userData.age >= particle.userData.lifeSpan) {
                particle.userData.active = false;
                particle.visible = false;
                continue;
            }
            
            // Facteur de vieillissement (0 au début, 1 à la fin de la vie)
            const ageFactor = particle.userData.age / particle.userData.lifeSpan;
            
            // Déplacer la particule selon sa vélocité
            particle.position.add(particle.userData.velocity);
            
            // Ajouter une dérive aléatoire pour plus de réalisme
            particle.position.x += (Math.random() - 0.5) * 0.002;
            particle.position.z += (Math.random() - 0.5) * 0.002;
            
            // Augmenter la taille avec l'âge
            const size = 0.05 + 0.2 * ageFactor;
            particle.scale.set(size, size, size);
            
            // Réduire l'opacité avec l'âge
            particle.material.opacity = 0.7 * (1 - ageFactor);
        }
        
        // Continuer l'animation
        if (this.isSmoking) {
            requestAnimationFrame(() => this.animateSmoke());
        }
    }
    
    // Diminuer progressivement la cigarette pendant qu'on fume
    consumeCigarette(delta) {
        if (!this.isSmoking || !this.smokingCigarette) return;
        
        // Diminuer la longueur de la cigarette
        this.cigaretteLength -= this.consumptionRate * delta;
        
        // Limiter la longueur minimale
        if (this.cigaretteLength <= 0.05) {
            this.cigaretteLength = 0.05;
            // La cigarette est terminée, arrêter de fumer
            this.stopSmoking(true); // true pour indiquer que la cigarette est terminée
            return;
        }
        
        // Mettre à jour la géométrie de la cigarette
        if (this.originalCigaretteMeshes) {
            // Pour le modèle GLB chargé
            const scaleFactor = this.cigaretteLength / 0.4; // Facteur d'échelle basé sur la longueur initiale
            
            for (const meshInfo of this.originalCigaretteMeshes) {
                meshInfo.mesh.scale.x = meshInfo.originalScale.x * scaleFactor;
            }
        } else if (this.smokingCigarette.children) {
            // Pour la cigarette simple (cylindre)
            const cigaretteBody = this.smokingCigarette.children[0];
            
            if (cigaretteBody && cigaretteBody.geometry) {
                // Créer une nouvelle géométrie avec la longueur mise à jour
                cigaretteBody.geometry.dispose();
                cigaretteBody.geometry = new THREE.CylinderGeometry(0.03, 0.03, this.cigaretteLength, 16);
            }
            
            // Mettre à jour la position du bout incandescent
            if (this.smokingCigarette.children.length > 1) {
                const embers = this.smokingCigarette.children[1];
                embers.position.set(0, this.cigaretteLength / 2, 0);
            }
        }
    }
    
    // Arrêter de fumer
    stopSmoking(fullyConsumed = false) {
        if (!this.isSmoking) return;
        
        this.isSmoking = false;
        console.log("Arrêt de la consommation de cigarette");
        
        // Nettoyer les éléments visuels
        if (this.smokingCigarette) {
            this.scene.remove(this.smokingCigarette);
            this.smokingCigarette = null;
        }
        
        if (this.smokeSystem) {
            this.scene.remove(this.smokeSystem);
            this.smokeParticles = [];
            this.smokeSystem = null;
        }
        
        // Décrémenter le compteur de cigarettes si elle a été entièrement consommée
        if (fullyConsumed) {
            this.cigaretteCount = Math.max(0, this.cigaretteCount - 1);
            this.updateCigaretteCounter();
            this.showMessage("Cigarette terminée. Il vous reste " + this.cigaretteCount + " cigarettes.");
        } else {
            this.showMessage("Vous avez arrêté de fumer.");
        }
        
        // Réinitialiser les propriétés
        this.cigaretteLength = 0.4; // Réinitialiser pour la prochaine cigarette
    }
    
    // Méthode mise à jour appelée à chaque frame pour les animations
    update(delta) {
        if (this.isSmoking) {
            this.updateCigarettePosition();
            this.animateCigarette();
            this.consumeCigarette(delta);
        }
    }
}

// Fonction pour augmenter la taille des feuilles d'arbres
function enlargeTreeLeaves(object, scaleFactor = 1.5) {
    object.traverse(function(child) {
        // Recherche les objets qui représentent des feuilles (par leur nom ou matériau)
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

// Exemple: Si vous avez une fonction qui charge les arbres
function loadTreeModel(position) {
    const loader = new THREE.GLTFLoader();
    
    loader.load('models/tree.gltf', function(gltf) {
        const tree = gltf.scene;
        
        // Agrandir les feuilles de l'arbre chargé
        enlargeTreeLeaves(tree, 2.0); // Facteur d'échelle de 2x
        
        tree.position.copy(position);
        scene.add(tree);
    });
}
