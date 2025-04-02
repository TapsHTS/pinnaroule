document.addEventListener('DOMContentLoaded', () => {
    // Créer les dossiers nécessaires
    // Initialiser le jeu
    const game = new Game();
    game.init();
    game.animate();

    // Gestionnaire d'événements pour les touches
    document.addEventListener('keydown', (event) => {
        game.handleKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
        game.handleKeyUp(event);
    });

    // Gestionnaire de redimensionnement
    window.addEventListener('resize', () => {
        game.handleResize();
    });
});
