import p5 from 'p5';

export class GrassMonster {
    private p: p5;
    private angerLevel: number = 0;
    private isAngry: boolean = false;
    private particles: Particle[] = [];
    private purifying: boolean = false;
    private purificationTimer: number = 0;

    constructor(p: p5) {
        this.p = p;
    }

    updateStatus(status: { status: string; anger_level: number }) {
        const wasAngry = this.isAngry;
        this.isAngry = status.status === 'HUNGRY';
        this.angerLevel = status.anger_level;

        if (wasAngry && !this.isAngry) {
            this.purifying = true;
            this.purificationTimer = 60; // frames
        }

        if (this.isAngry && this.particles.length === 0) {
            this.initParticles();
        }
    }

    private initParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(this.p));
        }
    }

    draw() {
        if (this.purifying) {
            this.drawPurification();
            return;
        }

        if (!this.isAngry) return;

        this.p.clear(0, 0, 0, 0);

        // Splitting/Growth logic
        if (this.p.frameCount % 300 === 0 && this.particles.length < (this.angerLevel / 10 + 5)) {
            this.particles.push(new Particle(this.p));
        }

        for (let particle of this.particles) {
            particle.update(this.angerLevel);
            particle.display();
        }
    }

    private drawPurification() {
        this.p.clear(0, 0, 0, 0);
        this.p.push();
        this.p.noStroke();
        for (let particle of this.particles) {
            // Glow green effect
            this.p.fill(100, 255, 100, (this.purificationTimer / 60) * 255);
            particle.display();
            particle.vel.mult(0.9); // Slow down
            particle.pos.add(particle.vel);
        }
        this.p.pop();

        this.purificationTimer--;
        if (this.purificationTimer <= 0) {
            this.purifying = false;
            this.particles = [];
        }
    }
}

class Particle {
    private p: p5;
    pos: p5.Vector;
    vel: p5.Vector;
    private noiseOffset: p5.Vector;
    private size: number;

    constructor(p: p5) {
        this.p = p;
        this.pos = p.createVector(p.random(p.width), p.random(p.height));
        this.vel = p.createVector(0, 0);
        this.noiseOffset = p.createVector(p.random(1000), p.random(1000));
        this.size = p.random(50, 100);
    }

    update(angerLevel: number) {
        const noiseScale = 0.005;
        const speed = 2 + (angerLevel / 20);

        let angle = this.p.noise(this.pos.x * noiseScale + this.noiseOffset.x, this.pos.y * noiseScale + this.noiseOffset.y) * this.p.TWO_PI * 2;
        this.vel.x = this.p.cos(angle) * speed;
        this.vel.y = this.p.sin(angle) * speed;

        this.pos.add(this.vel);

        // Wrapping
        if (this.pos.x < -this.size) this.pos.x = this.p.width + this.size;
        if (this.pos.x > this.p.width + this.size) this.pos.x = -this.size;
        if (this.pos.y < -this.size) this.pos.y = this.p.height + this.size;
        if (this.pos.y > this.p.height + this.size) this.pos.y = -this.size;

        // Grow based on anger
        this.size = this.p.lerp(this.size, 50 + angerLevel * 2, 0.01);
    }

    display() {
        this.p.push();
        this.p.translate(this.pos.x, this.pos.y);

        // Brown amorphous blob (withered grass theme)
        this.p.fill(80, 60, 40, 200);
        this.p.noStroke();

        this.p.beginShape();
        for (let a = 0; a < this.p.TWO_PI; a += 0.5) {
            let xoff = this.p.cos(a) + 1;
            let yoff = this.p.sin(a) + 1;
            let r = this.size + this.p.noise(xoff + this.p.frameCount * 0.01, yoff) * (this.size * 0.5);
            let x = r * this.p.cos(a);
            let y = r * this.p.sin(a);
            this.p.vertex(x, y);
        }
        this.p.endShape(this.p.CLOSE);

        // Add some "withered grass" spikes
        this.p.stroke(60, 40, 20);
        this.p.strokeWeight(2);
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * this.p.TWO_PI;
            this.p.line(0, 0, this.p.cos(angle) * this.size * 1.2, this.p.sin(angle) * this.size * 1.2);
        }
        this.p.pop();
    }
}
