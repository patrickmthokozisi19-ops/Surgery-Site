const wrapper = document.querySelector(".wrapper");

const backgrounds = [
    "/body imgs/pexels-cottonbro-5722158.jpg",
    "/body imgs/pexels-cristian-rojas-8460030.jpg"
];

let current = 0;

function changeBackground() {
    wrapper.style.backgroundImage = `url("${backgrounds[current]}")`;

    current++;

    if (current >= backgrounds.length) {
        current = 0;
    }
}

changeBackground();

setInterval(changeBackground, 5000);