// Функция для создания HTML-содержимого попапа на карте
function createMapPopup(data) {
  const dateFormatted = data.date.split("-").reverse().join(".");
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width: 150px;">
      <div style="font-weight: bold; font-size: 13px; color: #2c3e50; margin-bottom: 4px;">${data.title}</div>
      <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 6px;">
        📅 ${dateFormatted} <span style="color: #e67e22; margin-left: 5px;">🕒 ${data.time}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; color: #27ae60; border-top: 1px solid #eee; padding-top: 5px;">
        <span>KM: ${data.km}</span>
        <span>Min: ${data.min}</span>
      </div>
    </div>`;
}

// Функция для создания элемента списка в боковой панели
function createListItem(data) {
  const dateFormatted = data.date.split("-").reverse().join(".");
  const isRed = data.isError;
  const markerColor = isRed ? "#e74c3c" : "#27ae60";

  const item = document.createElement("div");
  item.className = "route-item";

  // Применяем стили напрямую, чтобы не мутировать внешние CSS
  item.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-left: 4px solid ${markerColor};
    cursor: pointer;
    transition: all 0.2s;
    ${isRed ? "background-color: #fff5f5;" : ""}
  `;

  item.innerHTML = `
    <div style="font-weight: 700; font-size: 14px; color: #34495e; line-height: 1.2;">${data.title}</div>
    <div style="font-size: 12px; color: #95a5a6; margin: 5px 0;">
      <span>📅 ${dateFormatted}</span>
      <span style="margin-left: 12px; color: #e67e22;">🕒 ${data.time}</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
      <div style="font-weight: 700; font-size: 13px; color: #27ae60;">KM: ${data.km}</div>
      <div style="font-weight: 700; font-size: 13px; color: #27ae60;">Min: ${data.min}</div>
    </div>
  `;

  return item;
}
