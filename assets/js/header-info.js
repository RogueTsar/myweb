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

    function loadWeather() {
        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY)); } catch (e) {}

        if (cached && Date.now() - cached.ts < WEATHER_CACHE_TTL) {
            showWeather(cached.text);
            return;
        }

        // Fetch from wttr.in using simple format
        fetch('https://wttr.in/?format=%t+%C', { cache: 'no-store' })
            .then(function (r) { return r.text(); })
            .then(function (raw) {
                var text = raw.trim();
                // Simplify: extract temp + a short icon
                var match = text.match(/([+-]?\d+)\s*°?C/i);
                var temp = match ? match[1] + '°C' : text;
                var icon = '';
                if (/clear|sunny/i.test(text)) icon = '☀️';
                else if (/cloud|overcast/i.test(text)) icon = '☁️';
                else if (/rain|drizzle/i.test(text)) icon = '🌧';
                else if (/snow/i.test(text)) icon = '❄️';
                else if (/thunder|storm/i.test(text)) icon = '⛈';
                else if (/fog|mist/i.test(text)) icon = '🌫';
                else if (/partial|partly/i.test(text)) icon = '⛅';
                else icon = '🌤';
                var display = icon + ' ' + temp;
                try { sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), text: display })); } catch (e) {}
                showWeather(display);
            })
            .catch(function () {
                hideWeatherSep();
            });
    }

    // Initial render
    hideWeatherSep();
    updateDate();
    loadWeather();

    // Update time every minute
    setInterval(updateDate, 60000);
})();
