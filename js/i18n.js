export const DEFAULT_LOCALE = "es";

export const TRANSLATIONS = {
  es: {
    "meta.title": "Regata del Viento",
    "meta.description": "Juego móvil de carreras de barcos en estilo 8 bits con río, mar, slalom, IA y circuitos con boyas.",
    "ui.canvasLabel": "Juego de carrera de barcos",
    "ui.time": "Tiempo",
    "ui.speed": "Velocidad",
    "ui.goal": "Meta",
    "ui.lap": "Vuelta",
    "ui.best": "Mejor: {time}",
    "ui.noTime": "--:--.-",
    "ui.start": "Zarpar",
    "ui.restart": "Nueva regata",
    "ui.share": "Compartir",
    "ui.about": "Acerca de",
    "ui.close": "Cerrar",
    "ui.aboutTitle": "Acerca de",
    "ui.aboutText": "Regata del Viento es una carrera móvil de barcos en 8 bits. Mantén pulsado el timón, gira con el dedo y compite en río, mar o slalom.",
    "mode.time": "Mejor tiempo",
    "mode.race": "Contra IA",
    "course.river": "Río",
    "course.sea": "Mar",
    "course.slalom": "Slalom",
    "difficulty.easy": "Fácil",
    "difficulty.normal": "Normal",
    "difficulty.hard": "Difícil",
    "result.finish": "Has cruzado la meta",
    "result.newBest": "Nuevo mejor tiempo",
    "result.victory": "Victoria en {course}",
    "result.position": "Puesto {rank} de 4",
    "result.summary": "{time} · {speed} kt",
    "share.title": "Regata del Viento",
    "share.text": "He hecho {time} en {course} jugando a Regata del Viento.",
    "share.copied": "Resultado copiado"
  },
  en: {
    "meta.title": "Wind Regatta",
    "meta.description": "Mobile 8-bit boat racing game with river, sea, slalom, AI rivals and buoy circuits.",
    "ui.canvasLabel": "Boat racing game",
    "ui.time": "Time",
    "ui.speed": "Speed",
    "ui.goal": "Goal",
    "ui.lap": "Lap",
    "ui.best": "Best: {time}",
    "ui.noTime": "--:--.-",
    "ui.start": "Sail",
    "ui.restart": "New race",
    "ui.share": "Share",
    "ui.about": "About",
    "ui.close": "Close",
    "ui.aboutTitle": "About",
    "ui.aboutText": "Wind Regatta is a mobile 8-bit boat racer. Hold the wheel, steer with your finger and race river, sea or slalom courses.",
    "mode.time": "Best time",
    "mode.race": "Versus AI",
    "course.river": "River",
    "course.sea": "Sea",
    "course.slalom": "Slalom",
    "difficulty.easy": "Easy",
    "difficulty.normal": "Normal",
    "difficulty.hard": "Hard",
    "result.finish": "You crossed the finish",
    "result.newBest": "New best time",
    "result.victory": "Victory in {course}",
    "result.position": "Place {rank} of 4",
    "result.summary": "{time} · {speed} kt",
    "share.title": "Wind Regatta",
    "share.text": "I scored {time} in {course} playing Wind Regatta.",
    "share.copied": "Result copied"
  }
};

export function createI18n(locale = document.documentElement.lang || DEFAULT_LOCALE) {
  const active = TRANSLATIONS[locale] ? locale : DEFAULT_LOCALE;
  return {
    locale: active,
    t(key, values = {}) {
      const template = TRANSLATIONS[active][key] || TRANSLATIONS[DEFAULT_LOCALE][key] || key;
      return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
    }
  };
}
