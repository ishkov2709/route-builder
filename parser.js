function parseRawData(rawText) {
  if (!rawText) return [];

  // Разбиваем текст по датам
  const entries = rawText
    .split(/(?=\b202\d-\d{2}-\d{2}\b)/)
    .filter((e) => e.trim().length > 20);

  return entries.map((entry, index) => {
    // Очищаем строку от лишних пробелов и символов табуляции
    const cleanEntry = entry.replace(/\s+/g, " ").trim();

    // 1. Координаты (берем вторую пару)
    const coordMatches = [
      ...cleanEntry.matchAll(/(\d{2}\.\d+),\s+(\d{2}\.\d+)/g),
    ];
    const lat =
      coordMatches.length >= 2 ? parseFloat(coordMatches[1][1]) : null;
    const lng =
      coordMatches.length >= 2 ? parseFloat(coordMatches[1][2]) : null;

    // 2. Дата и время
    const dateTimeMatch = cleanEntry.match(
      /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
    );
    let date = "00.00.0000",
      time = "00:00:00";
    if (dateTimeMatch) {
      date = dateTimeMatch[1].split("-").reverse().join(".");
      time = dateTimeMatch[2];
    }

    // 3. Извлечение KM и Min (надежный поиск после статуса)
    let km = "0",
      min = "0";
    const statusMarker = /дані (?:не |умовно )?підтверджені/i;
    const markerMatch = cleanEntry.match(statusMarker);

    if (markerMatch) {
      // Ищем все числа (включая дробные с запятой) после слов "дані підтверджені"
      const afterStatus = cleanEntry
        .substring(markerMatch.index + markerMatch[0].length)
        .trim();
      const numbers = afterStatus.match(/(\d+[.,]\d+|\d+)/g);

      if (numbers && numbers.length > 0) {
        km = numbers[0]; // Первое число — пробег
        // Ищем Min — обычно это 3-е число в последовательности после статуса в таблице
        if (numbers.length >= 3) {
          min = numbers[2];
        }
      }
    }

    // 4. Глубокая очистка заголовка
    let title = cleanEntry
      .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/, "") // Убираем дату/время
      .replace(/^\s*\d+\s+/, "") // Убираем номер МЛ в начале
      .replace(/\b\d{10,25}\b/g, "") // Убираем очень длинные ID терминалов
      .split(/\d{2}\.\d+/)[0] // Обрезаем всё, начиная с координат
      .replace(/дані (?:не |умовно )?підтверджені.*/i, "") // Убираем хвост со статусами
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: index + 1,
      date,
      time,
      title: title || "Об'єкт",
      km,
      min,
      lat,
      lng,
      isError: cleanEntry.includes("Завдання не у координатах"), //
    };
  });
}
