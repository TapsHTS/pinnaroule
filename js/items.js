class ItemManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.items = [];
        this.inventoryItems = {
            filter: false,
            paper: false,
            tobacco: false,
            taga: false  // Ajout du nouvel élément "taga"
        };
        this.interactionDistance = 2;
        this.cigaretteCount = 0; // Compteur de cigarettes
        
        this.init();
        this.createCigaretteCounter(); // Initialiser le compteur de cigarettes
    }
    
    init() {
        // Créer les objets à collecter
        this.createItem('filter', new THREE.Vector3(8, 1, 3), 0xFFFFFF);
        this.createItem('paper', new THREE.Vector3(-7, 1, 5), 0xF5F5DC);
        this.createItem('tobacco', new THREE.Vector3(3, 1, -8), 0x8B4513);
        this.createItem('taga', new THREE.Vector3(5, 1, 8), 0xA52A2A); // Nouvel objet taga à une position différente
        
        // Mettre à jour l'interface utilisateur
        this.updateUI();
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
                        break;
                    }
                }
            }
        }
    }
    
    collectItem(item, index) {
        const type = item.userData.type;
        
        this.inventoryItems[type] = true;
        this.scene.remove(item);
        this.items.splice(index, 1);
        
        this.updateUI();
        this.showCollectionMessage(type);
        
        // Vérifier si tous les éléments sont collectés
        if (this.hasAllItems()) {
            setTimeout(() => {
                this.createCigarette();
            }, 1000);
        }
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
        
        // Réinitialiser les objets à collecter après un court délai
        setTimeout(() => {
            this.init();
        }, 2000);
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
        
        if (this.hasAllItems()) {
            message += " Vous avez tous les éléments! Une cigarette va être créée.";
        }
        
        this.showMessage(message);
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
}
