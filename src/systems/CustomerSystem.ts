import { BALANCE } from '../data/balance';
import { CUSTOMER_TYPES } from '../data/customers';
import { LOCATIONS, SECONDS_PER_HOUR, type LocationDef } from '../data/locations';
import { buildMap } from '../data/maps';
import { SUPPLIES } from '../data/supplies';
import { CartEntity, type Floater } from '../entities/Cart';
import { Customer } from '../entities/Customer';
import { Vehicle } from '../entities/Vehicle';
import type { GameState, LocationId, LostReason } from '../game/types';
import type { EventBus } from '../util/events';
import { chance, clamp, gauss, pick, rand, weightedPick } from '../util/rng';
import type { GameMap, Point } from '../world/Map';
import { Pathfinder } from '../world/Pathfinding';
import { pickRoute, routeExposure } from '../world/Routes';
import {
  adjustPopularity,
  demand,
  repeatChance,
  satisfactionFor,
  tipAmount,
  tipChance,
  type DemandBreakdown,
} from './EconomySystem';
import { eventBudgetFor, eventCrowdWeight } from './EventSystem';
import { BASE_VIEW_RADIUS, exposureFor, trafficScale } from './ExposureSystem';
import { consumeCup, cupsPossible, limitingIngredient } from './InventorySystem';
import type { Modifiers } from './Modifiers';
import { lostReaction, reactionFor, type Reaction } from './ReactionSystem';
import { samplePrefs, tasteScore } from './RecipeSystem';
import { currentWeather } from './WeatherSystem';

export const MAX_PEDESTRIANS = 64;

/** Vehicles spawned per simulated second on each map's through roads. */
const VEHICLE_RATE: Partial<Record<LocationId, number>> = {
  kota: 0.55,
  premium: 0.55,
  perkantoran: 0.45,
  terminal: 0.45,
  pasar: 0.35,
  alunalun: 0.3,
  sekolah: 0.3,
  kampus: 0.2,
  pantai: 0.15,
  taman: 0.15,
  asri: 0.15,
};
const QUEUE_SPACING = 0.55;

export interface SimContext {
  state: GameState;
  mods: Modifiers;
  events: EventBus;
}

export interface FeedItem {
  text: string;
  tone: Reaction['tone'];
  who: string;
  /** Game time (minutes) when it was said. */
  at: number;
}

/** Average of the hour curve over the base trading day (07:00–19:00). */
function meanHourFactor(def: LocationDef): number {
  const hours = def.hourCurve.slice(0, 12);
  return hours.reduce((a, b) => a + b, 0) / hours.length;
}

/** Runtime (non-saved) contents of the active neighbourhood. */
export class World {
  readonly map: GameMap;
  readonly pathfinder: Pathfinder;
  readonly def: LocationDef;
  readonly customers: Customer[] = [];
  readonly vehicles: Vehicle[] = [];
  readonly queue: Customer[] = [];
  readonly floaters: Floater[] = [];
  readonly feed: FeedItem[] = [];
  readonly cart = new CartEntity();
  serving: Customer | null = null;
  serviceLeft = 0;
  serviceTotal = 1;
  private spawnAcc = 0;
  private regularAcc = 0;
  private vehicleAcc = 0;
  private demandCache: DemandBreakdown | null = null;
  private demandAge = 0;

  /** Arrival multiplier that keeps the cart's customer flow independent of map size. */
  readonly trafficScale: number;
  /** Most pedestrians on screen at once (grows with the size of the neighbourhood). */
  readonly maxPedestrians: number;

  constructor(readonly locationId: LocationId) {
    this.map = buildMap(locationId);
    this.pathfinder = new Pathfinder(this.map);
    this.def = LOCATIONS[locationId];
    this.trafficScale = trafficScale(locationId);
    // Room for the extra walkers of a larger map (and of busier, more spread-out ones).
    this.maxPedestrians = Math.round(MAX_PEDESTRIANS * Math.max(1, (this.map.width * this.map.height) / (24 * 24)) * Math.max(1.6, this.trafficScale * 0.75));
  }

  /** World position of queue slot i (slot 0 = being served). */
  slotPos(i: number): Point {
    const c = this.map.cart;
    return { x: c.serveX + 0.5 + c.qdx * i * QUEUE_SPACING, y: c.serveY + 0.5 + c.qdy * i * QUEUE_SPACING };
  }

  /** Pre-populates the street so the scene doesn't start empty. */
  warmUp(ctx: SimContext): void {
    const n = Math.round(10 * Math.min(3, this.trafficScale * ((this.map.width * this.map.height) / (24 * 24)) ** 0.5));
    for (let i = 0; i < n; i++) this.scatter(this.spawn(ctx, true, false));
  }

  /** Puts a freshly spawned walker somewhere along their route (as if they had been walking a while). */
  private scatter(c: Customer | null): void {
    if (!c) return;
    const steps = Math.floor(Math.random() * Math.max(1, c.path.length - 2));
    c.pathIndex = Math.min(c.path.length - 1, 1 + steps);
    const p = c.path[c.pathIndex - 1];
    c.x = p.x + 0.5 + c.offX;
    c.y = p.y + 0.5 + c.offY;
    if (c.decideAt >= 0 && c.pathIndex > c.decideAt) c.decided = true;
  }

  /** Walkers expected on the streets at once for the current traffic (arrival rate × time to cross the map). */
  private steadyCrowd(ctx: SimContext): number {
    const perSecond = (this.demand(ctx).traffic * this.trafficScale) / SECONDS_PER_HOUR;
    return Math.min(this.maxPedestrians * 0.8, (perSecond * exposureFor(this.locationId, BASE_VIEW_RADIUS).avgPath) / 1.3);
  }

  /**
   * The stand just opened: people already walking the streets may notice it
   * on the rest of their way, so trading starts with a busy street instead
   * of waiting for new arrivals to walk in from the edge of the map.
   */
  beginTrading(ctx: SimContext): void {
    // Top the street up to its usual crowd (e.g. when opening right after the night).
    let missing = Math.round(this.steadyCrowd(ctx) - this.customers.filter((c) => c.state === 'walking').length);
    while (missing-- > 0) this.scatter(this.spawn(ctx, false, false));
    for (const c of this.customers) {
      if (c.state !== 'walking' || c.decided || c.decideAt >= 0 || c.pathIndex >= c.path.length - 1) continue;
      const rest = c.path.slice(c.pathIndex);
      const exp = routeExposure(this.map, rest, ctx.mods.viewRadius);
      if (!exp) continue;
      c.decideAt = c.pathIndex + exp.decideAt;
      c.proximity = exp.proximity;
    }
  }

  demand(ctx: SimContext): DemandBreakdown {
    if (!this.demandCache || this.demandAge > 0.5) {
      this.demandCache = demand(ctx.state, ctx.mods);
      this.demandAge = 0;
    }
    return this.demandCache;
  }

  invalidateDemand(): void {
    this.demandCache = null;
  }

  update(ctx: SimContext, dt: number): void {
    const s = ctx.state;
    this.demandAge += dt;
    const d = this.demand(ctx);
    const open = s.phase === 'open';

    // --- Spawning: Poisson-like arrivals at the traffic rate (ambient walkers outside trading hours).
    // Before opening the clock stands at 07:00, so the street already carries the opening-hour crowd.
    const perSecond = (d.traffic * this.trafficScale) / SECONDS_PER_HOUR;
    this.spawnAcc += perSecond * dt * (1 + (Math.random() - 0.5) * 0.5);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.customers.length < this.maxPedestrians) this.spawn(ctx, !open, false);
    }

    // --- Regulars come back on purpose, heading straight for the cart.
    if (open) {
      const prog = s.locations[this.locationId];
      const busy = d.traffic / Math.max(0.01, this.def.traffic * meanHourFactor(this.def));
      const regPerSecond = (prog.regulars * BALANCE.regulars.visitShare * ctx.mods.regularVisitMult * busy) / (12 * SECONDS_PER_HOUR);
      this.regularAcc += regPerSecond * dt;
      while (this.regularAcc >= 1) {
        this.regularAcc -= 1;
        if (this.customers.length < this.maxPedestrians + 6) this.spawn(ctx, false, true);
      }
    }

    this.updateVehicles(dt);

    // --- Customers
    const realDt = dt / Math.max(1, s.speed);
    for (const c of this.customers) {
      c.tickBubble(dt, realDt);
      switch (c.state) {
        case 'walking': {
          if (!c.decided && c.decideAt >= 0 && c.pathIndex >= c.decideAt) {
            c.decided = true;
            if (open) this.decide(ctx, c, d);
            if (c.state !== 'walking') break;
          }
          if (c.followPath(dt)) c.path = [];
          break;
        }
        case 'toQueue': {
          c.waited += dt;
          if (c.pathIndex < c.path.length) c.followPath(dt);
          else {
            const t = this.slotPos(c.queueSlot);
            if (c.moveTo(t.x, t.y, dt)) c.state = 'queued';
          }
          this.checkPatience(ctx, c);
          break;
        }
        case 'queued': {
          c.waited += dt;
          const t = this.slotPos(c.queueSlot);
          c.moveTo(t.x, t.y, dt);
          c.dirX = -this.map.cart.qdx || c.dirX;
          c.dirY = -this.map.cart.qdy || c.dirY;
          if (c !== this.serving) this.checkPatience(ctx, c);
          break;
        }
        case 'served':
          break;
        case 'leaving':
          if (c.followPath(dt)) c.path = [];
          break;
      }
    }

    // --- Serving the head of the queue
    const head = this.queue[0];
    if (!this.serving && head && head.state === 'queued' && head.queueSlot === 0 && !head.moving && open) {
      this.serving = head;
      this.serviceTotal = ctx.mods.serviceTime * rand(0.85, 1.15);
      this.serviceLeft = this.serviceTotal;
      this.cart.startServing();
    }
    if (this.serving) {
      this.serviceLeft -= dt;
      if (this.serviceLeft <= 0) this.completeSale(ctx, this.serving, d);
    }
    this.cart.update(dt, this.serviceTotal, !!this.serving);

    // --- Cleanup finished walkers
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      const done = (c.state === 'walking' || c.state === 'leaving') && c.path.length === 0;
      if (!done) continue;
      if (!c.bubble && !c.reaction) this.customers.splice(i, 1);
      else {
        // Let speech bubbles finish quickly at the map edge, then vanish.
        if (c.bubble) c.bubble.t = Math.min(c.bubble.t, 0.3);
        if (c.reaction) c.reaction.t = Math.min(c.reaction.t, 0.3);
      }
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t -= dt;
      if (f.t <= 0) this.floaters.splice(i, 1);
    }
  }

  // ----------------------------------------------------------------- spawning

  private spawn(ctx: SimContext, ambient: boolean, regular: boolean): Customer | null {
    const d = this.demand(ctx);
    const ev = d.event;
    const type = CUSTOMER_TYPES[weightedPick(this.def.crowd.map((c) => ({ weight: c.weight * eventCrowdWeight(ev, c.type), value: c.type })))];
    const cart = this.map.cart;
    const route = pickRoute(this.map, this.pathfinder, Math.random, regular ? { x: cart.serveX, y: cart.serveY } : undefined);
    if (!route) return null;
    const c = new Customer(type, route.from, route.to);
    c.setPath(route.path);
    c.regular = regular;
    c.budget = d.budgetBase * type.budgetMult * eventBudgetFor(ev, type.id) * clamp(1 + BALANCE.demand.budgetSpread * gauss(), 0.6, 1.5);
    c.patience = type.patience * ctx.mods.patienceMult * rand(0.8, 1.2) * (regular ? 1.2 : 1);
    c.prefs = samplePrefs(this.def, type, gauss, Math.random);
    if (!ambient) {
      const exp = routeExposure(this.map, c.path, ctx.mods.viewRadius);
      if (exp) {
        c.decideAt = exp.decideAt;
        c.proximity = exp.proximity;
      }
    }
    this.customers.push(c);
    return c;
  }

  // ----------------------------------------------------------------- reactions

  private visibleReactions(): number {
    let n = 0;
    for (const c of this.customers) if (c.reaction) n++;
    return n;
  }

  /** Records a reaction in the feed and, if there's room on screen, as a text bubble. */
  private react(ctx: SimContext, c: Customer, r: Reaction): void {
    this.feed.unshift({ text: r.text, tone: r.tone, who: c.type.name + (c.regular ? ' (langganan)' : ''), at: ctx.state.timeMin });
    if (this.feed.length > BALANCE.reactions.feedSize) this.feed.length = BALANCE.reactions.feedSize;
    if (this.visibleReactions() < BALANCE.reactions.maxVisible) c.reaction = { text: r.text, tone: r.tone, t: BALANCE.reactions.seconds };
  }

  // ----------------------------------------------------------------- decisions

  private lose(ctx: SimContext, c: Customer, reason: LostReason): void {
    const s = ctx.state;
    s.today.lost[reason]++;
    s.totals.lostCustomers++;
    adjustPopularity(s, this.locationId, -BALANCE.popularity.lost[reason]);
    const prog = s.locations[this.locationId];
    if (c.regular && reason !== 'price') prog.regulars = Math.max(0, prog.regulars - 0.5);
    else if (c.regular) prog.regulars = Math.max(0, prog.regulars - 1);
    c.say(reason === 'price' ? 'price' : reason === 'stock' ? 'empty' : reason === 'queue' ? 'crowded' : 'wait');
    const missing = reason === 'stock' ? limitingIngredient(s) : null;
    this.react(ctx, c, lostReaction(reason, missing ? SUPPLIES[missing].name.toLowerCase() : undefined));
    ctx.events.emit('lost', { reason, x: c.x, y: c.y });
  }

  private decide(ctx: SimContext, c: Customer, d: DemandBreakdown): void {
    const s = ctx.state;
    s.today.passersby++;
    const p = c.regular
      ? clamp(BALANCE.regulars.interest * Math.min(1.2, d.thirst), 0, 0.95)
      : clamp(d.interest * c.type.thirst * c.proximity, 0, BALANCE.demand.maxInterest);
    if (!chance(p)) return;
    if (s.price > c.budget) {
      s.today.complaints.pricey++;
      this.lose(ctx, c, 'price');
      return;
    }
    if (cupsPossible(s) <= this.queue.length) {
      this.lose(ctx, c, 'stock');
      return;
    }
    if (this.queue.length >= ctx.mods.queueCapacity) {
      this.lose(ctx, c, 'queue');
      return;
    }
    this.joinQueue(c);
  }

  private joinQueue(c: Customer): void {
    c.state = 'toQueue';
    c.queueSlot = this.queue.length;
    c.waited = 0;
    this.queue.push(c);
    const slot = this.slotPos(c.queueSlot);
    const goal = this.nearestWalkable(Math.floor(slot.x), Math.floor(slot.y));
    const path = this.pathfinder.find({ x: c.tileX, y: c.tileY }, goal);
    c.setPath(path ?? []);
    if (!path) c.pathIndex = 0;
    c.say('thirsty', null, 1.4);
  }

  private nearestWalkable(x: number, y: number): Point {
    if (this.map.walkable(x, y)) return { x, y };
    const cart = this.map.cart;
    return { x: cart.serveX, y: cart.serveY };
  }

  private checkPatience(ctx: SimContext, c: Customer): void {
    if (c.waited > c.patience) {
      ctx.state.today.complaints.slow++;
      this.leaveQueue(c);
      this.lose(ctx, c, 'patience');
    }
  }

  private leaveQueue(c: Customer): void {
    const i = this.queue.indexOf(c);
    if (i >= 0) this.queue.splice(i, 1);
    if (this.serving === c) this.serving = null;
    this.queue.forEach((q, k) => (q.queueSlot = k));
    c.state = 'leaving';
    c.queueSlot = -1;
    const path = this.pathfinder.find({ x: this.walkTileX(c), y: this.walkTileY(c) }, c.exit);
    c.setPath(path ?? []);
  }

  private walkTileX(c: Customer): number {
    return this.map.walkable(c.tileX, c.tileY) ? c.tileX : this.map.cart.serveX;
  }
  private walkTileY(c: Customer): number {
    return this.map.walkable(c.tileX, c.tileY) ? c.tileY : this.map.cart.serveY;
  }

  /** Service, comfort and consistency effects on satisfaction right now. */
  private serviceScore(ctx: SimContext): number {
    const B = BALANCE.satisfaction;
    const mods = ctx.mods;
    const w = currentWeather(ctx.state);
    const hot = w.id === 'terik' || w.id === 'panas';
    let service = mods.satBonus + mods.consistency + (hot || w.id === 'hangat' ? mods.shadeBonus : 0);
    if (!mods.hasDispenser && this.queue.length >= B.rushQueue) service -= B.rushPenalty;
    if (hot) service += mods.hasCooler ? B.coolerFreshness : !mods.hasIceStorage ? -B.noStorageHotPenalty : 0;
    return service;
  }

  private completeSale(ctx: SimContext, c: Customer, d: DemandBreakdown): void {
    const s = ctx.state;
    const mods = ctx.mods;
    const service = this.serviceScore(ctx);
    this.serving = null;
    const cost = consumeCup(s);
    if (cost === null) {
      this.leaveQueue(c);
      this.lose(ctx, c, 'stock');
      this.dismissQueue(ctx, 'stock');
      return;
    }
    const price = s.price;
    const l = s.today;
    const prog = s.locations[this.locationId];
    const w = currentWeather(s);

    const taste = tasteScore(s.recipe, c.prefs, mods, { ice: w.iceShift, sugar: d.event.sugarPref });
    const sat = satisfactionFor({ taste: taste.score, price, fair: d.fairPrice, budget: c.budget, waited: c.waited, patience: c.patience, type: c.type, service });
    const tip = chance(tipChance(sat.value, c.type.tipMult, mods.tipService)) ? tipAmount(price, c.type.premium, Math.random()) : 0;

    // Money: drink revenue and tips are recorded separately.
    s.cash += price + tip;
    l.revenue += price;
    l.tips += tip;
    if (tip) l.tipCount++;
    l.cupsSold++;
    l.customersServed++;
    l.ingredientCost += cost;
    if (c.regular) l.regularsServed++;
    prog.cupsSold++;
    prog.revenue += price;
    s.totals.cupsSold++;
    s.totals.revenue += price;
    s.totals.tips += tip;
    s.totals.customersServed++;

    // Reputation: satisfaction, taste reputation, popularity, loyalty.
    l.satisfactionSum += sat.value;
    prog.satisfaction += (sat.value - prog.satisfaction) * BALANCE.satisfaction.emaAlpha;
    prog.quality += (taste.score - prog.quality) * BALANCE.quality.reputationAlpha;
    const P = BALANCE.popularity;
    adjustPopularity(
      s,
      this.locationId,
      P.perSale * ((sat.value - 50) / 50) * mods.popGainMult * d.event.popularityGain +
        (price <= d.fairPrice ? P.fairPriceBonus : 0) +
        (c.regular && sat.value >= BALANCE.satisfaction.happy ? P.regularBonus : 0),
    );
    const cap = this.def.traffic * BALANCE.regulars.capPerTraffic;
    if (c.regular) {
      if (sat.value < BALANCE.regulars.quitBelow) prog.regulars = Math.max(0, prog.regulars - 1);
    } else if (chance(repeatChance(sat.value) * mods.regularJoinMult)) prog.regulars = Math.min(cap, prog.regulars + 1);

    // Feedback
    if (sat.value >= BALANCE.satisfaction.happy) {
      l.feedback.happy++;
      c.say('happy');
    } else if (sat.value >= BALANCE.satisfaction.neutral) {
      l.feedback.neutral++;
      c.say('neutral', taste.complaint);
    } else {
      l.feedback.unhappy++;
      const complaint = taste.complaint ?? (sat.pricePenalty >= sat.waitPenalty ? 'pricey' : 'slow');
      l.complaints[complaint]++;
      c.say('unhappy', complaint);
    }
    this.react(ctx, c, reactionFor({ sat, taste, price, fair: d.fairPrice, tip, regular: c.regular, hot: w.id === 'terik' || w.id === 'panas' }));
    c.hasCup = true;
    this.cart.celebrate();
    this.floaters.push({ x: c.x, y: c.y, text: `+${Math.round(price / 100) / 10}rb`, color: '#ffe66d', t: 1.4 });
    if (tip) this.floaters.push({ x: c.x + 0.3, y: c.y - 0.3, text: `tip +${tip}`, color: '#8ee06b', t: 1.8 });
    ctx.events.emit('sale', { price, tip, x: c.x, y: c.y, satisfaction: sat.value });
    this.leaveQueue(c);
    if (cupsPossible(s) === 0) this.dismissQueue(ctx, 'stock');
  }

  /** Sends everyone in the queue away (sold out, closing time, moving). */
  dismissQueue(ctx: SimContext, reason: LostReason | null): void {
    for (const c of this.queue.slice()) {
      this.leaveQueue(c);
      if (reason) this.lose(ctx, c, reason);
    }
    this.serving = null;
  }

  // ----------------------------------------------------------------- traffic

  private updateVehicles(dt: number): void {
    const lanes = this.map.lanes;
    if (lanes.length) {
      const rate = VEHICLE_RATE[this.locationId] ?? 0.15;
      this.vehicleAcc += rate * dt;
      if (this.vehicleAcc >= 1) {
        this.vehicleAcc = 0;
        const lane = pick(lanes);
        const clear = !this.vehicles.some((v) => v.lane === lane && Math.abs(v.pos - lane.from) < 2.2);
        if (clear && this.vehicles.length < 14) this.vehicles.push(new Vehicle(lane));
      }
    }
    for (const v of this.vehicles) v.update(dt, this.vehicleBlocked(v));
    for (let i = this.vehicles.length - 1; i >= 0; i--) if (this.vehicles[i].done) this.vehicles.splice(i, 1);
  }

  /** Vehicles stop for pedestrians on the road ahead and keep distance from the car in front. */
  private vehicleBlocked(v: Vehicle): boolean {
    const dir = v.lane.dir;
    const ahead0 = v.pos + dir * (v.length * 0.5);
    const ahead1 = v.pos + dir * (v.length * 0.5 + 1.2);
    const lo = Math.min(ahead0, ahead1);
    const hi = Math.max(ahead0, ahead1);
    for (const o of this.vehicles) {
      if (o === v || o.lane !== v.lane) continue;
      const back = o.pos - dir * (o.length * 0.5);
      if (back >= lo - 0.2 && back <= hi) return true;
    }
    for (const c of this.customers) {
      const along = v.lane.axis === 'x' ? c.x : c.y;
      const across = v.lane.axis === 'x' ? c.y : c.x;
      if (Math.abs(across - v.lane.at) < 0.9 && along >= lo && along <= hi) {
        const t = this.map.tile(c.tileX, c.tileY);
        if (t && (t.type === 'cross' || t.type === 'road')) return true;
      }
    }
    return false;
  }
}
