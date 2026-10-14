function openExerciseModal(title, imgSrc, sets, reps) {
    const modal = document.getElementById('exerciseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalImg = document.getElementById('modalImg');
    const modalSets = document.getElementById('modalSets');
    const modalReps = document.getElementById('modalReps');

    modalTitle.textContent = title;
    modalImg.src = imgSrc;
    modalSets.textContent = sets;
    modalReps.textContent = reps;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeExerciseModal() {
    const modal = document.getElementById('exerciseModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal if clicking outside content
window.onclick = function(event) {
    const modal = document.getElementById('exerciseModal');
    if (event.target == modal) {
        closeExerciseModal();
    }
}

// Add some nice entry animations for cards
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.exercise-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * (index + 1));
    });
});
