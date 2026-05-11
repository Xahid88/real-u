document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scan-btn');
  const statusText = document.getElementById('status-text');
  const scoreCircle = document.getElementById('score-circle');
  const scoreText = document.getElementById('score-text');
  const metricsList = document.getElementById('metrics-list');

  scanBtn.addEventListener('click', async () => {
    // UI Update: Scanning State
    scanBtn.disabled = true;
    scanBtn.querySelector('.btn-text').innerText = 'Analyzing...';
    statusText.innerText = 'Extracting media & context...';
    document.querySelector('.score-card').classList.add('scanning');
    metricsList.innerHTML = '<li class="metric-item placeholder">Running AI models...</li>';

    try {
      // Get active tab
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Send message to content script to start analysis
      chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_PAGE" }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          handleError('Could not read page. Refresh and try again.');
          return;
        }

        if (!response) {
          handleError('Analysis failed. Could not extract page data.');
          return;
        }

        // Send extracted data to our Real U Backend
        statusText.innerText = 'Consulting Real U AI & Cache...';
        try {
          const apiRes = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: tab.url,
              title: response.title,
              textContent: response.textContent,
              images: response.images,
              videos: response.videos
            })
          });

          const data = await apiRes.json();
          if (!apiRes.ok) throw new Error(data.error || 'Server error');
          
          handleAnalysisResult(data);
        } catch (serverErr) {
          console.error(serverErr);
          handleError('Server connection failed. Is the Real U server running?');
        }
      });
    } catch (err) {
      console.error(err);
      handleError('Unexpected error occurred.');
    }
  });

  function handleError(msg) {
    document.querySelector('.score-card').classList.remove('scanning');
    scanBtn.disabled = false;
    scanBtn.querySelector('.btn-text').innerText = 'Rescan Content';
    statusText.innerText = msg;
    scoreText.innerText = 'ERR';
    metricsList.innerHTML = '<li class="metric-item placeholder">Analysis failed.</li>';
  }

  function handleAnalysisResult(data) {
    document.querySelector('.score-card').classList.remove('scanning');
    scanBtn.disabled = false;
    scanBtn.querySelector('.btn-text').innerText = 'Rescan Content';

    const score = data.score;
    
    // Update Score Circle
    scoreCircle.style.strokeDasharray = `${score}, 100`;
    scoreText.innerText = `${score}%`;

    // Determine color and status
    let statusMsg = "";
    if (score >= 85) {
      scoreCircle.style.stroke = 'var(--success)';
      statusMsg = 'Content appears authentic.';
    } else if (score >= 60) {
      scoreCircle.style.stroke = 'var(--warning)';
      statusMsg = 'Some inconsistencies detected.';
    } else {
      scoreCircle.style.stroke = 'var(--danger)';
      statusMsg = 'High probability of misinformation.';
    }
    
    // Show if it was cached
    statusText.innerHTML = data.cached ? `⚡ <strong>Cached:</strong> ${statusMsg}` : `🤖 <strong>AI:</strong> ${statusMsg}`;

    // Update Metrics List
    metricsList.innerHTML = '';
    
    const metricClass = (val) => {
      const v = val.toLowerCase();
      if (v === 'clean' || v === 'verified' || v === 'human' || v === 'high') return 'safe';
      if (v === 'suspicious' || v === 'likely ai' || v === 'medium') return 'warning';
      return 'danger';
    };

    const metrics = [
      { label: "Deepfake Detection", value: data.metrics.deepfake, status: metricClass(data.metrics.deepfake) },
      { label: "Context Match", value: data.metrics.contextMatch, status: metricClass(data.metrics.contextMatch) },
      { label: "AI Text Gen", value: data.metrics.aiTextGen, status: metricClass(data.metrics.aiTextGen) },
      { label: "Source Trust", value: data.metrics.sourceTrust, status: metricClass(data.metrics.sourceTrust) }
    ];

    metrics.forEach(m => {
      const li = document.createElement('li');
      li.className = 'metric-item';
      li.innerHTML = `<span class="metric-label">${m.label}</span><span class="metric-value ${m.status}">${m.value}</span>`;
      metricsList.appendChild(li);
    });

    // Add summary
    if (data.summary) {
      const sumLi = document.createElement('li');
      sumLi.className = 'metric-item';
      sumLi.style.flexDirection = 'column';
      sumLi.style.alignItems = 'flex-start';
      sumLi.style.fontSize = '11px';
      sumLi.style.lineHeight = '1.4';
      sumLi.style.color = '#8b949e';
      sumLi.innerHTML = `<strong>AI Summary:</strong> ${data.summary}`;
      metricsList.appendChild(sumLi);
    }
  }
});
