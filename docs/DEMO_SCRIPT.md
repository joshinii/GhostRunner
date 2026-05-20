# Ghost Strategist — 15-Minute Demo Script

**Team**: Jaya Vyas · Joshini Naagraj · Mohsen Minai
**Format**: Each person speaks and controls the screen for their segment.
**Device**: iPhone 17 Pro Simulator, screen mirrored/recorded.

---

## Segment 1 — Jaya (0:00 – 5:00) · Introduction + Dashboard + Start Race

---

### 0:00 – 0:45 · Team Introduction

> "Hi, we are Jaya, Joshini, and Mohsen. Our project is Ghost Strategist — a real-time AI coaching app for runners and cyclists.
> The core idea: you record a GPS route, and later you race against a ghost of your past self on that exact route.
> But the key innovation is the multi-agent AI system that observes your telemetry every 8 seconds and tells you exactly what to do — push, hold, recover, or stop for safety."

---

### 0:45 – 2:00 · Dashboard Walkthrough

**[SCREEN: Open app — Home tab is visible]**

> "This is the dashboard. At the top you see the athlete profile — readiness score 86 out of 100, target pace 7:35 per mile, max heart rate estimate 188 bpm, and a data quality score of 97%."

**[SCREEN: Scroll down to Strategy Tools panel]**

> "Below the controls is the Strategy Tools panel — this lists the six AI agents we built.
> Bio-Guard is the safety agent. Heart Rate Analysis monitors intensity zones.
> Elevation Scan looks 12 GPS points ahead on the route. Dynamic Pacer manages the gap to the ghost.
> Weather Analyst factors in wind load. And Finish Predictor projects your finish time continuously."

**[SCREEN: Scroll to System Flow panel]**

> "The System Flow panel shows our Observe-Reason-Act loop. Step 1: GPS and heart rate stream in at 1 Hz. Step 2: the ghost engine interpolates the stored route at 60 fps. Step 3: the snapshot builder combines pace, gap, HR, elevation, and wind into one decision state. Step 4: the agent returns a tactical instruction."

---

### 2:00 – 3:00 · Start Demo Race

**[SCREEN: Scroll back up to Demo Controls]**

> "Now I'll start a demo race. The simulator uses a road-snapped route around the SJSU campus area."

**[SCREEN: Tap "Start Demo Race"]**

> "Watch the Race tab — you'll see a 3-2-1 countdown before the race begins."

**[SCREEN: Race tab opens automatically — countdown shows 3... 2... 1...]**

> "The app switches straight to the Race tab. There's the countdown — 3, 2, 1 — and the race begins."

---

### 3:00 – 5:00 · Race Tab Overview

**[SCREEN: Race tab, race running, map visible with both markers]**

> "On the map you can see two markers. The green marker is the athlete — that's me. The purple sparkle marker is the ghost from the previous best session.
> The green polyline shows the section of the route already covered.
> In the top-right corner you can see the status — Live GPS Simulation at 1 Hz — one telemetry point per second."

**[SCREEN: Point to metrics grid]**

> "The metrics grid updates every second. Distance, the gap to the ghost in metres — positive means the ghost is ahead — current pace, heart rate, projected finish time, and elevation change in the next 12 route points.
> I'll hand over to Joshini now who will walk through the multi-agent system live."

---

## Segment 2 — Joshini (5:00 – 10:00) · Live Race + Multi-Agent Coaching

---

### 5:00 – 6:30 · Coaching Banner

**[SCREEN: Race running, scroll down to coaching banner]**

> "Every 8 seconds, the multi-agent orchestrator fires. It collects a vote from all six agents and picks a winner based on confidence scores.
> The result appears here in the coaching banner. The color tells you the action — orange means Push, green means Hold, purple means Recover, and red is a safety override.
> Notice the line that says 'Also active' — that shows the other agents that triggered but didn't win the confidence vote. So you can see all the agents that contributed to this moment."

**[SCREEN: Wait for coaching to update — point to the Also active line when visible]**

> "There — Dynamic Pacer won with 90% confidence because the gap is opening. But you can also see Heart Rate Analysis and Predict Finish Time are active in the background."

---

### 6:30 – 8:00 · Agent Votes Panel

**[SCREEN: Scroll down to Live Snapshot panel]**

> "This is the Live Snapshot panel. It shows every agent's state in real time.
> Active agents — for example, 3 out of 6 triggered this tick.
> The Primary agent is the one whose instruction is showing on the banner.
> And here is the Agent Votes section — all six agents listed with their confidence percentages."

**[SCREEN: Point to the agent rows in the panel]**

> "Each row has a colored dot — bright if triggered, muted if not.
> Bio-Guard here shows a dash — heart rate hasn't crossed 174 yet so it's not triggered.
> Dynamic Pacer is at 90% because the gap is 80 metres.
> Predict Finish Time always shows at 30% — it's our baseline agent, always contributing.
> This is what makes our architecture transparent — you can audit every decision."

---

### 8:00 – 9:30 · Bio-Guard Safety Override

**[SCREEN: Continue watching the race — let it run until HR climbs, or narrate while waiting]**

> "Our Bio-Guard agent is the safety guarantee in the system. It has a hard override — when heart rate reaches 174 bpm or above, it wins regardless of any other agent's confidence score. No pacing agent, no matter how confident, can override Bio-Guard."

**[SCREEN: When Bio-Guard triggers — banner turns red]**

> "There it is — heart rate has crossed the threshold. Bio-Guard activates at 100% confidence. The banner turns red. The instruction is to ease off and let heart rate settle for 45 seconds.
> Notice in the votes panel — Bio-Guard is now at 100% and every other agent is overridden.
> This is a real safety constraint — in a production system this would also pause audio cues and trigger a haptic alert."

---

### 9:30 – 10:00 · Text-to-Speech

> "One more feature — the coaching instructions are not just visual. The app speaks them aloud using AVSpeechSynthesizer, Apple's built-in text-to-speech engine.
> Every time the orchestrator fires a new decision, the phone says the instruction out loud — so the athlete doesn't need to look at the screen while running.
> I'll hand over to Mohsen for the data science and session analytics side."

---

## Segment 3 — Mohsen (10:00 – 15:00) · Data Engineering + History + Recording

---

### 10:00 – 11:30 · History Tab + Session Detail

**[SCREEN: Tap History tab]**

> "The History tab aggregates all past sessions. At the top you see the analytics summary — total sessions, average data quality score, and the percentage of coaching advice that was followed.
> Below that are the session cards. Each card shows the key stats, a live pace chart, and the race narrative — a natural language summary generated from the coaching event history."

**[SCREEN: Scroll to Campus Loop session card — point to the two buttons at the bottom]**

> "Each card has two actions. The chart icon opens the full session detail."

**[SCREEN: Tap the chart icon — SessionDetailView sheet opens]**

> "This is the session detail screen. Stats grid at the top. Then the pace chart. Then the Agent Coaching Events — a log of every decision the AI made during that race, with the timestamp, which agent triggered, and the exact instruction given.
> Below that is the Data Pipeline breakdown."

**[SCREEN: Scroll to Data Pipeline in detail sheet]**

> "The GPS data passes through three stages — outlier filtering, exponential moving average smoothing with alpha 0.3, and gap interpolation for signal loss. Here you can see 1448 raw points reduced to 1445 after removing 3 outlier points with poor accuracy."

**[SCREEN: Dismiss sheet — back to session card]**

---

### 11:30 – 12:30 · Race This Ghost

> "Now the most important button — Race This Ghost."

**[SCREEN: Tap Race This Ghost on the Campus Loop card]**

> "This loads the Campus Loop session's GPS route into the race engine, triggers the countdown, and switches straight to the Race tab — all in one tap."

**[SCREEN: Countdown fires, Race tab opens with the loaded route]**

> "The ghost is now running the stored Campus Loop route. The athlete races against their personal best from that session. The agents observe the same state and coach in real time."

**[SCREEN: Let race run for a few seconds — show the map and coaching banner]**

---

### 12:30 – 13:30 · Record Tab

**[SCREEN: Tap Record tab]**

> "The Record tab captures real GPS workouts using Core Location at high accuracy. The map draws the route in real time as you move.
> The stats grid shows elapsed time, distance, live pace, simulated heart rate, GPS point count, and the activity mode.
> You can toggle between Run and Ride before starting."

**[SCREEN: Tap Start Recording — show the recording state dot]**

> "Recording starts — the red dot in the corner confirms it. GPS points accumulate.
> In a real outdoor scenario, the route would draw on the map as you run. On the simulator you would set a simulated location in Xcode."

**[SCREEN: Tap Stop Recording]**

> "After stopping, the Save Session to History button appears. Tapping it builds a PastSession from the captured GPS, applies the smoothing pipeline, generates a narrative, and inserts it at the top of the History list — ready to be raced against."

---

### 13:30 – 14:30 · Feedback Loop + Data Engineering

**[SCREEN: Tap History tab, scroll to Feedback Loop panel]**

> "The Feedback Loop panel is where the system learns. Every coaching event is stored with the full telemetry state at the time — heart rate, pace, gap, elevation ahead.
> After a race, we can compare: did pace improve in the 30 seconds after a Push instruction? Did heart rate recover after Bio-Guard fired? The chart here shows effectiveness trending upward across coaching events in the current race."

**[SCREEN: If a race has been run, the live events list is visible below the chart]**

> "Below the chart you see the actual coaching events from this race — timestamp, agent name, severity. This is the full feedback loop — observe, reason, act, evaluate."

---

### 14:30 – 15:00 · Wrap-Up

> "To summarise — Ghost Strategist demonstrates:
>
> — A real multi-agent AI architecture with 6 independent agents, confidence-based orchestration, and a hard safety override that is visible and auditable in the UI.
>
> — A full data engineering pipeline — GPS smoothing, outlier filtering, gap interpolation, quality scoring — with before-and-after numbers shown in the app.
>
> — An Observe-Reason-Act loop running at 1 Hz observation and 8-second decision cadence, with text-to-speech output and a persistent coaching event log.
>
> — And a complete iOS experience — GPS recording, ghost racing, session analytics, and a feedback loop — built in Swift with MapKit, AVFoundation, and Core Location.
>
> Thank you."

---

## Quick Reference — Features by Speaker

| Speaker | Features Covered |
|---|---|
| **Jaya** | App intro, dashboard, strategy tools, ORA loop, start race, ghost concept |
| **Joshini** | Coaching banner, Also active line, agent votes panel, Bio-Guard override, TTS |
| **Mohsen** | Session detail, coaching event log, data pipeline, Race This Ghost, Record tab, feedback loop |

## Timing Breakdown

| Time | Segment |
|---|---|
| 0:00 – 0:45 | Jaya: Team intro |
| 0:45 – 2:00 | Jaya: Dashboard + strategy tools |
| 2:00 – 3:00 | Jaya: Start demo race + countdown |
| 3:00 – 5:00 | Jaya: Race tab overview, hand off |
| 5:00 – 6:30 | Joshini: Coaching banner + Also active |
| 6:30 – 8:00 | Joshini: Agent votes panel |
| 8:00 – 9:30 | Joshini: Bio-Guard override |
| 9:30 – 10:00 | Joshini: TTS, hand off |
| 10:00 – 11:30 | Mohsen: History tab + session detail |
| 11:30 – 12:30 | Mohsen: Race This Ghost |
| 12:30 – 13:30 | Mohsen: Record tab |
| 13:30 – 14:30 | Mohsen: Feedback loop |
| 14:30 – 15:00 | Mohsen: Wrap-up |

## Setup Checklist (Before Demo)

- [ ] Xcode built and running on iPhone 17 Pro Simulator
- [ ] App freshly launched — Home tab visible
- [ ] Screen recording started on simulator
- [ ] Audio on — TTS will speak through Mac speakers
- [ ] No other apps open on simulator
