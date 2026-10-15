/* Countdown to the beginning of election day, not opening of voting. */
const electionDay = Date.parse('2026-10-25T00:00:00-03:00');
function remainingTime(now) {
  const minutes = Math.max(0, Math.ceil((electionDay - now) / 60000));
  return {days: Math.floor(minutes / 1440), hours: Math.floor(minutes % 1440 / 60), minutes: minutes % 60};
}
function updateCountdown() {
  const now = Date.now();
  const remaining = remainingTime(now);
  for (const unit of ['days', 'hours', 'minutes']) {
    document.getElementById('count-' + unit).textContent = String(remaining[unit]).padStart(2, '0');
  }
  const note = document.getElementById('countdown-note');
  if (now >= electionDay && now < electionDay + 86400000) note.textContent = 'Hoje é o dia da eleição.';
  else if (now >= electionDay + 86400000) note.textContent = 'Contagem encerrada · 25/10/2026';
  else note.textContent = 'Até 25/10, 0h · horário de Brasília';
}
updateCountdown();
setInterval(updateCountdown, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });
