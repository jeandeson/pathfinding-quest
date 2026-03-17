// player.ts
import type { Cell } from './grid';

export class Player {
  private currentCell: Cell;
  private targetCell: Cell | null = null;
  private path: Cell[] = [];
  private pathIndex: number = 0;
  private worldX: number;
  private worldY: number;
  private baseSpeed: number = 100;
  private speed: number = 100;
  private cellSize: number;
  private color: string;
  private label: string;
  public isPlayer: boolean = false;

  // Dash
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashDuration: number = 0.4;
  private dashSpeedMultiplier: number = 3.5;
  private dashCooldown: number = 0;
  private dashCooldownMax: number = 1.5;

  // Jump / obstacle skip
  public isJumping: boolean = false;
  private jumpTimer: number = 0;
  private jumpDuration: number = 0.35;
  private jumpHeight: number = 0; // visual offset Y
  private jumpTargetCell: Cell | null = null; // the obstacle cell to jump over

  // Juice: squash & stretch
  private scaleX: number = 1;
  private scaleY: number = 1;

  // Spritesheet
  private sprite: HTMLImageElement | null = null;
  private spriteWidth: number = 32;
  private spriteHeight: number = 32;
  private frameX: number = 0;
  private frameY: number = 0;
  private maxFrames: number = 4;
  private timer: number = 0;
  private animationInterval: number = 0.15;
  private isMoving: boolean = false;

  constructor(startCell: Cell, cellSize: number, color: string, label: string, spriteUrl?: string) {
    this.currentCell = startCell;
    this.worldX = startCell.worldX;
    this.worldY = startCell.worldY;
    this.cellSize = cellSize;
    this.color = color;
    this.label = label;

    if (spriteUrl) {
      this.sprite = new Image();
      this.sprite.src = spriteUrl;
    }
  }

  public setPath(newPath: Cell[] | null): void {
    if (!newPath || newPath.length === 0) {
      this.path = [];
      this.targetCell = null;
      return;
    }
    this.path = newPath;
    this.pathIndex = 0;
    this.advanceToNextCell();
  }

  private advanceToNextCell(): void {
    if (this.pathIndex + 1 < this.path.length) {
      this.pathIndex++;
      this.targetCell = this.path[this.pathIndex];
    } else {
      this.targetCell = null;
    }
  }

  /** Try to jump over the obstacle cell adjacent to currentCell in given direction.
   *  Returns true if jump was initiated. */
  public tryJump(grid: import('./grid').Grid): boolean {
    if (!this.isPlayer || this.isJumping) return false;

    // Find a non-walkable neighbor and the walkable cell beyond it
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const dir of dirs) {
      const obstX = this.currentCell.x + dir.x;
      const obstY = this.currentCell.y + dir.y;
      const landX = this.currentCell.x + dir.x * 2;
      const landY = this.currentCell.y + dir.y * 2;

      if (grid.isValid(obstX, obstY) && !grid.cells[obstY][obstX].walkable &&
          grid.isValid(landX, landY) && grid.cells[landY][landX].walkable) {
        // Launch jump
        this.isJumping = true;
        this.jumpTimer = 0;
        this.jumpTargetCell = grid.cells[landY][landX];
        // Cancel current path movement
        this.targetCell = null;
        this.path = [];
        return true;
      }
    }
    return false;
  }

  public activateDash(): void {
    if (!this.isPlayer || this.isDashing || this.dashCooldown > 0) return;
    this.isDashing = true;
    this.dashTimer = 0;
    this.dashCooldown = this.dashCooldownMax;
    // Squash on start of dash
    this.scaleX = 1.4;
    this.scaleY = 0.7;
  }

  public getDashCooldownRatio(): number {
    return this.dashCooldown / this.dashCooldownMax;
  }

  public update(deltaTime: number): void {
    // Dash cooldown
    if (this.dashCooldown > 0) this.dashCooldown -= deltaTime;

    // Dash timer
    if (this.isDashing) {
      this.dashTimer += deltaTime;
      this.speed = this.baseSpeed * this.dashSpeedMultiplier;
      if (this.dashTimer >= this.dashDuration) {
        this.isDashing = false;
        this.speed = this.baseSpeed;
      }
    } else {
      this.speed = this.baseSpeed;
    }

    // Jump update
    if (this.isJumping && this.jumpTargetCell) {
      this.jumpTimer += deltaTime;
      const t = Math.min(this.jumpTimer / this.jumpDuration, 1);
      // Arc: sin curve for height
      this.jumpHeight = Math.sin(t * Math.PI) * this.cellSize * 1.2;

      // Move towards jump target
      const targetX = this.jumpTargetCell.worldX;
      const targetY = this.jumpTargetCell.worldY;
      const dx = targetX - this.worldX;
      const dy = targetY - this.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = (this.cellSize * 2.5) * deltaTime / this.jumpDuration;

      if (dist < 4 || t >= 1) {
        this.worldX = targetX;
        this.worldY = targetY;
        this.currentCell = this.jumpTargetCell;
        this.isJumping = false;
        this.jumpHeight = 0;
        this.jumpTargetCell = null;
        // Squash on landing
        this.scaleX = 1.3;
        this.scaleY = 0.65;
      } else {
        const ratio = Math.min(1, moveSpeed / dist);
        this.worldX += dx * ratio;
        this.worldY += dy * ratio;
      }
      this.isMoving = true;
    }

    // Normal movement
    if (!this.isJumping) {
      if (!this.targetCell) {
        this.isMoving = false;
        this.frameX = 0;
      } else {
        const targetX = this.targetCell.worldX;
        const targetY = this.targetCell.worldY;
        const dx = targetX - this.worldX;
        const dy = targetY - this.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dx) > Math.abs(dy)) {
          this.frameY = dx > 0 ? 3 : 2;
        } else {
          this.frameY = dy > 0 ? 0 : 1;
        }

        if (distance < 2) {
          this.worldX = this.targetCell.worldX;
          this.worldY = this.targetCell.worldY;
          this.currentCell = this.targetCell;
          this.advanceToNextCell();
          return;
        }

        this.isMoving = true;
        const moveSpeed = this.speed * deltaTime;
        const ratio = Math.min(1, moveSpeed / distance);
        this.worldX += dx * ratio;
        this.worldY += dy * ratio;
      }
    }

    // Juice: squash & stretch while moving
    if (this.isMoving && !this.isJumping) {
      if (this.isDashing) {
        // Stretch in movement direction during dash
        if (this.targetCell) {
          const dx = this.targetCell.worldX - this.worldX;
          const dy = this.targetCell.worldY - this.worldY;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.scaleX = 1.35;
            this.scaleY = 0.75;
          } else {
            this.scaleX = 0.75;
            this.scaleY = 1.35;
          }
        }
      } else {
        // Gentle oscillating squash while walking
        const wobble = Math.sin(this.timer * 25) * 0.06;
        this.scaleX = 1.0 + wobble;
        this.scaleY = 1.0 - wobble;
      }
    } else if (!this.isJumping) {
      // Lerp back to 1,1
      this.scaleX += (1 - this.scaleX) * 0.2;
      this.scaleY += (1 - this.scaleY) * 0.2;
    }

    // Animation frames
    if (this.isMoving) {
      this.timer += deltaTime;
      if (this.timer > this.animationInterval) {
        this.frameX = (this.frameX + 1) % this.maxFrames;
        this.timer = 0;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, cellSize: number): void {
    const drawX = this.worldX;
    const drawY = this.worldY - this.jumpHeight;

    ctx.save();
    // Apply squash & stretch around center
    const cx = drawX + cellSize / 2;
    const cy = drawY + cellSize / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-cx, -cy);

    if (this.sprite && this.sprite.complete) {
      const sourceX = this.frameX * this.spriteWidth;
      const sourceY = this.frameY * this.spriteHeight;

      // Dash glow
      if (this.isDashing) {
        ctx.shadowColor = '#88eeff';
        ctx.shadowBlur = 18;
      }

      ctx.drawImage(
        this.sprite,
        sourceX, sourceY, this.spriteWidth, this.spriteHeight,
        drawX, drawY, cellSize, cellSize
      );

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(this.label, drawX + 5, drawY - 5);
    } else {
      const radius = cellSize / 2.5;
      const centerX = drawX + cellSize / 2;
      const centerY = drawY + cellSize / 2;

      if (this.isDashing) {
        ctx.shadowColor = '#88eeff';
        ctx.shadowBlur = 18;
      }

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(this.label, centerX - 5, centerY + 5);
    }

    // Shadow under jumping entity
    if (this.isJumping) {
      ctx.restore();
      ctx.save();
      const shadowAlpha = 0.3 * (1 - this.jumpHeight / (this.cellSize * 1.2));
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        this.worldX + cellSize / 2,
        this.worldY + cellSize * 0.85,
        cellSize * 0.3,
        cellSize * 0.1,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  public getCurrentCell(): Cell { return this.currentCell; }
  public getPath(): Cell[] { return this.path; }
  public getPathIndex(): number { return this.pathIndex; }
}