const socket = io();

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// Get username from the page text (simple approach)
const displayname = window.CHAT_DISPLAY_NAME || 'Anonymous'
function addLine({ author, text, sentAt }) {
  const line = document.createElement('div');
  const time = sentAt ? new Date(sentAt).toLocaleTimeString() : '';
  line.textContent = `[${time}] ${author}: ${text}`;
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
    text,
    sentAt: Date.now()
  });

  chatInput.value = '';
});
