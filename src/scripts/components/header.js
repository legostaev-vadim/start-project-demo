const header = document.querySelector('.header')
const button = document.querySelector('.header__button')

button.addEventListener('click', () => header.classList.toggle('header--open'))