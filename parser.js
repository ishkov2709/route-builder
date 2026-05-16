// parser.js
function parseRawData(rawText) {
  if (!rawText) return [];

  const entries = rawText
    .split(/(?=\b202\d-\d{2}-\d{2}\b)/)
    .filter((e) => e.trim().length > 20);

  return entries.map((entry, index) => {
    const cleanEntry = entry.replace(/\t/g, " ");
    const lines = cleanEntry
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. Дата и Время
    const dateTimeMatch = cleanEntry.match(
      /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
    );
    let date = "0000-00-00",
      time = "00:00:00";
    if (dateTimeMatch) {
      date = dateTimeMatch[1];
      time = dateTimeMatch[2];
    }

    // 2. Координаты (берем вторую пару)
    const coordMatches = [
      ...cleanEntry.matchAll(/(\d{2}\.\d+),\s+(\d{2}\.\d+)/g),
    ];
    const lat =
      coordMatches.length >= 2 ? parseFloat(coordMatches[1][1]) : null;
    const lng =
      coordMatches.length >= 2 ? parseFloat(coordMatches[1][2]) : null;

    // 3. KM и Min
    let km = "0",
      min = "0";
    const confirmIdx = lines.findIndex(
      (l) =>
        l.toLowerCase().includes("підтверджені") ||
        l.toLowerCase().includes("умовно"),
    );
    if (confirmIdx !== -1) {
      const kmMatch = lines[confirmIdx].match(/(\d+[.,]\d+|\d+)/);
      if (kmMatch) km = kmMatch[0];
      if (lines[confirmIdx + 1]) {
        const minMatch = lines[confirmIdx + 1].match(/(\d+[.,]\d+|\d+)/);
        if (minMatch) min = minMatch[0];
      }
    }

    // 4. ЧИСТЫЙ ЗАГОЛОВОК (Без номера МЛ)
    let titleParts = [];
    if (lines[0]) {
      let t1 = lines[0]
        .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/, "") // Убираем дату/время
        .replace(/^\s*\d+\s+/, "") // УДАЛЯЕМ НОМЕР МЛ В НАЧАЛЕ (тот самый "0")
        .replace(/\b\d{8}\b/g, "") // Убираем ID
        .trim();
      if (t1) titleParts.push(t1);
    }
    if (lines[1]) {
      let t2 = lines[1].split(/\d{2}\.\d+/)[0].trim(); // Берем текст до координат
      if (t2) titleParts.push(t2);
    }
    const fullTitle = titleParts.join(" ").replace(/\s+/g, " ").trim();

    // 5. Признак
    let status = "Завдання у координатах";
    if (cleanEntry.includes("Завдання не у координатах"))
      status = "Завдання не у координатах";
    if (cleanEntry.toLowerCase().includes("повернення додому"))
      status = "Повернення додому";

    return {
      id: index + 1,
      date,
      time,
      title: fullTitle || "Без назви",
      km,
      min,
      lat,
      lng,
      status,
      isError: status === "Завдання не у координатах",
    };
  });
}
