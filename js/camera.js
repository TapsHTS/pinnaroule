class CameraManager {
    constructor(player) {
        this.player = player;
        this.firstPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.thirdPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.activeCamera = this.firstPersonCamera; // Par défaut en vue première personne
        
        // Position de la caméra 3ème personne
        this.thirdPersonDistance = 5;
        this.thirdPersonHeight = 3;
        
        // Variables pour le contrôle de la caméra avec la souris
        this.mouseEnabled = false;
        this.mouseSensitivity = 0.002;
        this.yaw = 0; // Rotation horizontale (autour de l'axe Y)
        this.pitch = 0; // Rotation verticale (autour de l'axe X)
        this.minPitch = -Math.PI / 2 + 0.1; // Limite inférieure pour éviter de regarder trop vers le bas
        this.maxPitch = Math.PI / 2 - 0.1; // Limite supérieure pour éviter de regarder trop vers le haut
        
        // Initialiser les événements de la souris
        this.initMouseControls();
    }
    
    initMouseControls() {
        document.addEventListener('click', () => {
            if (!this.mouseEnabled) {
                this.enableMouseControls();
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.mouseEnabled) {
                this.handleMouseMove(event);
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                this.disableMouseControls();
            }
        });
    }
    
    enableMouseControls() {
        this.mouseEnabled = true;
        document.body.requestPointerLock();
        console.log('Contrôles souris activés');
    }
    
    disableMouseControls() {
        this.mouseEnabled = false;
        document.exitPointerLock();
        console.log('Contrôles souris désactivés');
    }
    
    handleMouseMove(event) {
        if (!this.mouseEnabled) return;
        
        // Mettre à jour la rotation horizontale (yaw)
        this.yaw -= event.movementX * this.mouseSensitivity;
        
        // Mettre à jour la rotation verticale (pitch) avec contraintes
        this.pitch -= event.movementY * this.mouseSensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        
        // Appliquer la rotation au joueur (juste la rotation Y)
        this.player.setRotationY(this.yaw);
    }
    
    toggleView() {
        this.activeCamera = (this.activeCamera === this.firstPersonCamera) 
            ? this.thirdPersonCamera 
            : this.firstPersonCamera;
    }
    
    update() {
        // Ne pas mettre à jour la rotation de la caméra si une animation est en cours
        if (this.player && (!window.game || !window.game.animationInProgress)) {
            const playerPosition = this.player.getPosition();
            const playerDirection = this.player.getDirection();
            
            // Mettre à jour la caméra première personne
            this.firstPersonCamera.position.set(
                playerPosition.x,
                playerPosition.y + 0.8, // Légèrement plus haut que la position du joueur
                playerPosition.z
            );
            
            // Appliquer la rotation pitch uniquement à la caméra, pas au joueur
            this.firstPersonCamera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
            
            // Mettre à jour la caméra troisième personne
            const offsetDirection = new THREE.Vector3(
                Math.sin(this.yaw) * Math.cos(this.pitch),
                Math.sin(this.pitch),
                Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            
            const offset = offsetDirection.multiplyScalar(-this.thirdPersonDistance);
            this.thirdPersonCamera.position.set(
                playerPosition.x + offset.x,
                playerPosition.y + this.thirdPersonHeight + offset.y,
                playerPosition.z + offset.z
            );
            
            this.thirdPersonCamera.lookAt(
                playerPosition.x,
                playerPosition.y + 1,
                playerPosition.z
            );
        }
    }
    
    updateAspect(aspect) {
        this.firstPersonCamera.aspect = aspect;
        this.firstPersonCamera.updateProjectionMatrix();
        this.thirdPersonCamera.aspect = aspect;
        this.thirdPersonCamera.updateProjectionMatrix();
    }
    
    getActiveCamera() {
        return this.activeCamera;
    }
}
