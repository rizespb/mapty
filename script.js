'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////////////////////////

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // В качесте ID будем использовать последние 10 цифр даты (момента создания Workout)
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = new Date();
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // свойство type, используемое в следующей строке, задается в классах Running и Cycling. Поэтому _setDescription мы пишем в родительском классе Workout, но вызывать его будем в конструкторах классов Running и Cycling
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

////////////////////////////////////////////////

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

////////////////////////////////////////////////

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////
/// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Устанвока нового маркера при отправке формы
    form.addEventListener('submit', this._newWorkout.bind(this));

    // В зависимости от выбора Running или Cycling показывать/ скрывать поля Cadence и Elevation
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // if (navigator.geolocation) проверяет, поддерживает ли браузер API navigator.geolocation. Если да, тогда вызывае функию navigator.geolocation
    if (navigator.geolocation)
      // getCurrentPosition должна получать в качестве параметров две фукнции:
      // 1. В случае успеха получения координат (этой функции автоматически передается в качестве парметра объект с координатами)
      // 2. Функция, вызываемая в случае ошибки получения координат
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your postion');
        }
      );
  }

  // Вывод карты с позиционированием по координатам пользователя
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.ru/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // L - это основная точка входа, используемая Leaflet
    // 'map' - это ID контейнера для карты
    // coords - сохранненые выше координты
    // 13 - масштаб
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Метод on() из библиотеки Leaflet - обработчик событий
    // Отлавливаем клик по карте
    this.#map.on('click', this._showForm.bind(this));

    // Выводим маркеры из информации, хранимой в локальном хранилище
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Показываем форму слева при клике на карту
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Очищаем поля ввода данных
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Для более красивого эффекта, мы делаем несколько манипуляций.
    // В принципе, достаточно было только добавить класс hidden
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Показывае / скрываем input для Cadence или Elevation Gain в зависимости от выборы Running или Cycling
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Устанвока нового маркера при отправке формы и вывод записи в списке под формой
  _newWorkout(e) {
    e.preventDefault();

    // Функция для проверки, являются ли введенные значения целыми числами
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, creat running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, creat cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      // elevation может быть отрицательным, поэтому это значение не проверяем allPositive
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Устанавливаем маркер на карте
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // Добавляем запись о тренировке в список тренировок
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  // Перемещение к соответствующему маркеру при клике на запись о тренировке

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // setView() - метод из библиотеки Leaflet
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // считаем клики по записи тренировки - для того, чтобы показать, что объекты, которые хранились в локальном хранилище и были конвертированы из строки снова в объекты теряют цепь прототипов и больше не связаны с прототипами. Их надо создать заново из полученной информации
    // workout.click();
  }

  // Устанавливаем локальное хранилище для информации
  _setLocalStorage() {
    // Первый параметр - название хранилища
    // Второй параметр - строка, которую надо хранить. Поэтому с помощью JSON.stringify конвертируем массив в строку
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Поучаем данные из локального хранилища
  _getLocalStorage() {
    // Конвертируем в массив данные из локального хранилища под названием workouts и сохраняем в переменную data
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    // Далее мы выводим только список тренровок слева.
    // Маркеры мы выести не можем, т.к. карта еще не загрузилась.
    // Поэтому маркеры мы будем выводит в методе _loadMap
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Удаление информации из локального хранилища
  // Будет вызываться из консоли
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
////////////////////////////////////////////////

const app = new App();

////////////////////////////////////////////////
