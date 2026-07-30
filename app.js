(function () {
  const DEPLOYMENT_ID = "03d74452-138d-4176-a6a3-4a2587f6956f";
  
  // Optional: Set your public backend proxy URL here (e.g. Render, Vercel, Cloud Run, or Ngrok)
  // Example: const PUBLIC_BACKEND_URL = "https://paramount-cxas.onrender.com";
  const PUBLIC_BACKEND_URL = "";

  function getApiBaseUrl() {
    if (PUBLIC_BACKEND_URL && PUBLIC_BACKEND_URL.trim() !== "") {
      return PUBLIC_BACKEND_URL.replace(/\/$/, "");
    }
    return "";
  }

  // Session Management
  let sessionId = localStorage.getItem("pplus_session_id_8200");
  if (!sessionId) {
    sessionId = "pplus-session-8200-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("pplus_session_id_8200", sessionId);
  }

  // DOM Elements
  const container = document.getElementById("cxasChatbotContainer");
  const launcherBtn = document.getElementById("cxasLauncherBtn");
  const closeBtn = document.getElementById("cxasCloseBtn");
  const resetBtn = document.getElementById("cxasResetBtn");
  const ttsToggleBtn = document.getElementById("ttsToggleBtn");
  const chatBody = document.getElementById("cxasChatBody");
  const chatInput = document.getElementById("cxasChatInput");
  const sendBtn = document.getElementById("cxasSendBtn");
  const micBtn = document.getElementById("micBtn");
  const speechStatus = document.getElementById("speechStatus");
  const unreadBadge = document.getElementById("unreadBadge");
  const quickChips = document.querySelectorAll(".chip-btn");

  let isWaiting = false;
  let isTtsEnabled = true;
  let currentAudioPlayer = null;
  let recognition = null;
  let isRecording = false;

  // Toggle Chat Window
  launcherBtn.addEventListener("click", () => {
    container.classList.toggle("is-open");
    if (container.classList.contains("is-open")) {
      chatInput.focus();
      if (unreadBadge) unreadBadge.style.display = "none";
    }
  });

  closeBtn.addEventListener("click", () => {
    container.classList.remove("is-open");
    stopMic();
  });

  // Reset Session
  resetBtn.addEventListener("click", () => {
    stopMic();
    sessionId = "pplus-session-8200-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("pplus_session_id_8200", sessionId);
    chatBody.innerHTML = "";
    appendAgentMessage("Session reset! Hello Alex! I'm your Paramount+ Virtual Assistant. How can I help guide your streaming experience today?", null, false);
  });

  // Voice Mute Toggle
  ttsToggleBtn.addEventListener("click", () => {
    isTtsEnabled = !isTtsEnabled;
    ttsToggleBtn.classList.toggle("active-tts", isTtsEnabled);
    ttsToggleBtn.style.color = isTtsEnabled ? "#00D2FF" : "rgba(255, 255, 255, 0.4)";
    ttsToggleBtn.title = isTtsEnabled ? "Chirp 3 Voice Active (Click to Mute)" : "Chirp 3 Voice Muted (Click to Enable)";
    if (!isTtsEnabled) {
      stopAudioPlayback();
    }
  });

  // Speech Recognition (Mic Input)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add("is-recording");
      speechStatus.textContent = "🎙️ Listening... Speak into microphone";
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      chatInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        speechStatus.textContent = `⚠️ Voice error: ${event.error}`;
      }
      stopMicUI();
    };

    recognition.onend = () => {
      stopMicUI();
      const val = chatInput.value.trim();
      if (val.length > 0) {
        speechStatus.textContent = "⏳ Processing your request...";
        handleSendMessage(val, true);
      } else {
        speechStatus.textContent = "";
      }
    };
  } else {
    micBtn.style.display = 'none';
  }

  micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isRecording) {
      stopMic();
    } else {
      startMic();
    }
  });

  function startMic() {
    if (!recognition || isRecording) return;
    chatInput.value = '';
    stopAudioPlayback();
    try {
      recognition.start();
    } catch (err) {
      console.warn("Mic start notice:", err);
    }
  }

  function stopMic() {
    stopAudioPlayback();
    if (recognition && isRecording) {
      try { recognition.stop(); } catch (e) {}
    }
    stopMicUI();
  }

  function stopMicUI() {
    isRecording = false;
    micBtn.classList.remove("is-recording");
  }

  // Play audio from Google Cloud CXAS Text-to-Speech Engine (en-US-Chirp3-HD-Erinome)
  function playGecxVoiceAudio(base64Mp3) {
    if (!base64Mp3) return;
    stopAudioPlayback();

    try {
      speechStatus.textContent = "🔊 Paramount+ Assistant (Chirp 3 Erinome) speaking...";
      const audioUrl = "data:audio/mp3;base64," + base64Mp3;
      currentAudioPlayer = new Audio(audioUrl);

      currentAudioPlayer.onended = () => {
        speechStatus.textContent = "";
        currentAudioPlayer = null;
      };

      currentAudioPlayer.play().catch(err => {
        console.warn("Audio playback blocked or interrupted:", err);
        speechStatus.textContent = "";
      });
    } catch (err) {
      console.error("Audio playback error:", err);
      speechStatus.textContent = "";
    }
  }

  function stopAudioPlayback() {
    if (currentAudioPlayer) {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
      currentAudioPlayer = null;
    }
  }

  // Global function to replay voice audio for a specific message
  window.replayGecxVoice = async function (text, audioB64) {
    if (audioB64) {
      playGecxVoiceAudio(audioB64);
    } else if (text) {
      try {
        speechStatus.textContent = "🔊 Synthesizing Chirp 3 Erinome Voice...";
        const apiBase = getApiBaseUrl();
        const resp = await fetch(apiBase + "/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            voice_name: 'en-US-Chirp3-HD-Erinome'
          })
        });
        const data = await resp.json();
        speechStatus.textContent = "";
        if (data.status === "success" && data.audio_content) {
          playGecxVoiceAudio(data.audio_content);
        }
      } catch (e) {
        console.error("Replay TTS error:", e);
        speechStatus.textContent = "";
      }
    }
  };

  // Send Message Flow
  async function handleSendMessage(text, fromVoice = false) {
    if (!text || isWaiting) return;

    const userMessage = text.trim();
    if (!userMessage) return;

    appendUserMessage(userMessage);
    chatInput.value = "";
    isWaiting = true;
    sendBtn.disabled = true;

    showTypingIndicator();

    const apiBase = getApiBaseUrl();

    try {
      const response = await fetch(apiBase + "/api/run-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMessage,
          session_id: sessionId,
          voice_name: 'en-US-Chirp3-HD-Erinome'
        })
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.status === "success" && data.reply) {
        appendAgentMessage(data.reply, data.audio_content, fromVoice);
      } else {
        appendAgentMessage("⚠️ Sorry, I encountered an error connecting to the Paramount+ Assistant service.", null, false);
      }
    } catch (err) {
      console.error("API Error:", err);
      removeTypingIndicator();

      const isPublicHost = !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1");
      if (isPublicHost && !PUBLIC_BACKEND_URL) {
        appendAgentMessage("🌐 **GitHub Pages Host Notice**:\nTo connect your live public GitHub Pages site to your CXAS Deployment `03d74452-138d-4176-a6a3-4a2587f6956f`, update `PUBLIC_BACKEND_URL` in `app.js` to point to your hosted backend proxy (e.g. Render, Railway, or Ngrok), or run `python3 server.py` locally.", null, false);
      } else {
        appendAgentMessage("⚠️ Network error. Please ensure the backend server is running.", null, false);
      }
    } finally {
      isWaiting = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  // Event Listeners for Input
  sendBtn.addEventListener("click", () => {
    handleSendMessage(chatInput.value, false);
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(chatInput.value, false);
    }
  });

  // Quick Action Chips
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const promptText = chip.getAttribute("data-prompt");
      if (promptText) {
        if (!container.classList.contains("is-open")) {
          container.classList.add("is-open");
        }
        handleSendMessage(promptText, false);
      }
    });
  });

  // Append User Message
  function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "msg-row user";
    row.innerHTML = `
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <div class="msg-meta">${getCurrentTime()}</div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();
  }

  // Append Agent Message
  function appendAgentMessage(markdownText, audioB64, shouldPlayAudio = false) {
    const row = document.createElement("div");
    row.className = "msg-row agent";
    const formattedHtml = parseMarkdown(markdownText);
    const plainText = stripHtml(formattedHtml);
    const escapedText = escapeAttr(plainText);

    row.innerHTML = `
      <div class="msg-bubble">${formattedHtml}</div>
      <div class="msg-meta">
        Paramount+ Concierge • ${getCurrentTime()}
        <button class="tts-replay-btn" title="Replay Chirp 3 Erinome Voice" onclick="window.replayGecxVoice('${escapedText}', '${audioB64 || ''}')">
          🔊 Play Voice
        </button>
      </div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();

    // Always play Chirp 3 Audio when requested
    if (shouldPlayAudio && isTtsEnabled) {
      if (audioB64) {
        playGecxVoiceAudio(audioB64);
      } else if (markdownText) {
        window.replayGecxVoice(plainText, null);
      }
    }
  }

  // Typing Indicator
  function showTypingIndicator() {
    const row = document.createElement("div");
    row.className = "typing-indicator-row";
    row.id = "typingIndicator";
    row.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // Markdown Parser
  function parseMarkdown(md) {
    if (!md) return "";
    let html = md;

    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const itemContent = trimmed.substring(2);
        result.push(`<li>${itemContent}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        if (trimmed) {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    }
    if (inList) result.push('</ul>');

    return result.join('');
  }

  // Initial welcome message (text-only)
  setTimeout(() => {
    if (chatBody.children.length === 0) {
      appendAgentMessage("Hello Alex! I'm your Paramount+ Virtual Assistant. How can I help guide your streaming experience today?", null, false);
    }
  }, 400);

})();
