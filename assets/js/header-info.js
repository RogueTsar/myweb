/* ── Header Info: live date/time + weather (wttr.in) ── */
(function () {
    var dateEl = document.getElementById('header-date');
    var weatherEl = document.getElementById('header-weather');
    var sepEl = document.querySelector('.header-info__sep');
    if (!dateEl) return;

    var WEATHER_CACHE_KEY = 'vs-weather-cache';
    var WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    var WMO_ICONS = {
        0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
        45: '🌫', 48: '🌫',
        51: '🌦', 53: '🌦', 55: '🌧',
        61: '🌧', 63: '🌧', 65: '🌧',
        71: '🌨', 73: '🌨', 75: '❄️',
        80: '🌦', 81: '🌧', 82: '⛈',
        95: '⛈', 96: '⛈', 99: '⛈'
    };

    function formatDate() {
        var now = new Date();
        var day = now.toLocaleDateString('en-US', { weekday: 'short' });
        var date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        var time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return day + ', ' + date + ' \u00B7 ' + time;
    }

    function updateDate() {
        if (dateEl) dateEl.textContent = formatDate();
    }

    function showWeather(text) {
        if (weatherEl) weatherEl.textContent = text;
        if (sepEl) sepEl.style.display = '';
    }

    function hideWeatherSep() {
        if (sepEl) sepEl.style.display = 'none';
    }

    function fetchOpenMeteo(lat, lon) {
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
            '&longitude=' + lon +
            '&current=temperature_2m,weather_code&temperature_unit=celsius&forecast_days=1';
        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var temp = Math.round(d.current.temperature_2m) + '°C';
                var icon = WMO_ICONS[d.current.weather_code] || '🌤';
                var display = icon + ' ' + temp;
                try { sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), text: display })); } catch (e) {}
                showWeather(display);
            })
            .catch(function () { hideWeatherSep(); });
    }

    function loadWeather() {
        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY)); } catch (e) {}

        if (cached && Date.now() - cached.ts < WEATHER_CACHE_TTL) {
            showWeather(cached.text);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (pos) { fetchOpenMeteo(pos.coords.latitude, pos.coords.longitude); },
                function () { hideWeatherSep(); },
                { timeout: 6000 }
            );
        } else {
            hideWeatherSep();
        }
    }

    // Initial render
    hideWeatherSep();
    updateDate();
    loadWeather();

    // Update time every minute
    setInterval(updateDate, 60000);
})();
