const socket = io();

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// Get username from the page text (simple approach)
const displayname = window.CHAT_DISPLAY_NAME.name || 'Anonymous'
const color = window.CHAT_DISPLAY_NAME.color || '#00000'
function addLine({ author, color, text, sentAt }) {
  const line = document.createElement('div');
  const time = sentAt ? new Date(sentAt).toLocaleTimeString() : '';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = author;
  nameSpan.style.color = color || '#000';

  const textSpan = document.createElement('span');
  textSpan.textContent = `: ${text}`;

  line.append(`[${time}] `, nameSpan, textSpan);
  chatBox.appendChild(line);
  chatBox.scrollTop = chatBox.scrollHeight;
}


socket.on('chat:message', (msg) => addLine(msg));

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  socket.emit('chat:message', {
    author: displayname,
    color: color,
    text,
    sentAt: Date.now()
  });

  chatInput.value = '';
});
