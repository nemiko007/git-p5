const API_URL = 'https://git-p5.vercel.app/api/monster'; // Change this to your Vercel URL later

async function fetchStatus() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log('Fetched status:', data);
        await chrome.storage.local.set({ monsterStatus: data });
    } catch (error) {
        console.error('Failed to fetch monster status:', error);
    }
}

// Set up alarm for periodic polling (every 15 minutes)
chrome.alarms.create('fetchStatus', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
    if (alarm.name === 'fetchStatus') {
        fetchStatus();
    }
});

// Fetch immediately on install/startup
chrome.runtime.onInstalled.addListener(() => {
    fetchStatus();
});

chrome.runtime.onStartup.addListener(() => {
    fetchStatus();
});
