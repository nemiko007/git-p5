import p5 from 'p5';
import { GrassMonster } from './monster';

console.log('GitHub Grass Reaper: Stalker injected.');

let canvasElement: HTMLCanvasElement | null = null;
let monsterInstance: GrassMonster | null = null;

const sketch = (p: p5) => {
    p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvasElement = canvas.elt as HTMLCanvasElement;
        canvasElement.style.position = 'fixed';
        canvasElement.style.top = '0';
        canvasElement.style.left = '0';
        canvasElement.style.pointerEvents = 'none'; // Initially non-interfering
        canvasElement.style.zIndex = '999999';
        monsterInstance = new GrassMonster(p);

        // Check initial state
        chrome.storage.local.get(['monsterStatus'], (result: { [key: string]: any }) => {
            if (result.monsterStatus) {
                monsterInstance?.updateStatus(result.monsterStatus);
                updateInterference(result.monsterStatus);
            }
        });
    };

    p.draw = () => {
        monsterInstance?.draw();
    };

    p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
    };
};

function updateInterference(status: any) {
    if (!canvasElement) return;

    // If anger level is high, start interfering with pointer events
    if (status.status === 'HUNGRY' && status.anger_level > 50) {
        canvasElement.style.pointerEvents = 'auto';
        // But we still want to be able to click through holes if we implement them
        // For now, let's just make it partially cover
    } else {
        canvasElement.style.pointerEvents = 'none';
    }
}

// Listen for status changes
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes.monsterStatus) {
        console.log('Status updated:', changes.monsterStatus.newValue);
        monsterInstance?.updateStatus(changes.monsterStatus.newValue as any);
        updateInterference(changes.monsterStatus.newValue);
    }
});

new p5(sketch);
