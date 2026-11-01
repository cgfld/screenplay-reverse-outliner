import { parseText } from "./parsing/parser";
export function demoProject() {
  const p = parseText(
    `THE LAST LIGHT
An original sample screenplay

INT. LIGHTHOUSE - DUSK
MARA packs a weathered logbook. ELI blocks the door, holding a radio.

ELI
The rescue boat is still an hour away.

MARA
Then we have an hour to fix the light.

She sets the bag down.

EXT. LIGHTHOUSE STEPS - NIGHT
Waves strike the stairs. Mara offers Eli the only safety rope.

ELI
You never let me help.

MARA
I'm asking now.

He takes the rope and follows her into the storm.

INT. LANTERN ROOM - NIGHT
Eli holds a broken wire against the contact. Mara turns the crank.
The lamp burns bright. A distant boat sounds its horn.

MARA
Don't let go.

ELI
I won't.

They watch the beam sweep the water.\n`,
    "The Last Light.txt",
  );
  p.scenes[0].analysis = {
    summary:
      "As a rescue boat approaches in darkness, Mara abandons her plan to leave and decides to repair the lighthouse with Eli.",
    purpose:
      "Establish the danger and turn Mara from withdrawal toward responsibility.",
    conflict:
      "Mara wants to leave; Eli needs her to stay and help guide the rescue boat.",
    turningPoint: "Mara sets down her packed bag, choosing to fix the light.",
    emotions: [
      {
        character: "MARA",
        involvement: "present",
        before: "Withdrawn",
        after: "Resolved",
        change: "Setting the bag down makes her commitment visible.",
      },
      {
        character: "ELI",
        involvement: "present",
        before: "Anxious",
        after: "Hopeful",
        change: "Mara agrees to help.",
      },
    ],
  };
  p.scenes[1].analysis = {
    summary:
      "On the storm-battered steps, Mara asks Eli for help and gives him the safety rope.",
    purpose: "Transform a practical obstacle into a moment of trust.",
    conflict:
      "Eli wants to be trusted; Mara has been protecting him by excluding him.",
    turningPoint: "Mara says “I’m asking now” and offers the rope.",
    emotions: [
      {
        character: "MARA",
        involvement: "present",
        before: "Controlling",
        after: "Trusting",
        change: "She invites Eli to share the risk.",
      },
      {
        character: "ELI",
        involvement: "present",
        before: "Resentful",
        after: "Determined",
        change: "Being asked to help gives him agency.",
      },
    ],
  };
  p.scenes[2].analysis = {
    summary:
      "Mara and Eli repair the lamp together; the rescue boat answers its light.",
    purpose:
      "Resolve the external danger through the trust built between the characters.",
    conflict:
      "They must maintain a fragile electrical connection long enough to guide the boat.",
    turningPoint: "The lamp lights and the boat sounds its horn.",
    emotions: [
      {
        character: "MARA",
        involvement: "present",
        before: "Determined",
        after: "Relieved",
        change: "Their shared effort succeeds.",
      },
      {
        character: "ELI",
        involvement: "present",
        before: "Determined",
        after: "Assured",
        change: "He proves he can be relied on.",
      },
    ],
  };
  p.scenes.forEach((s) => (s.analyzed = true));
  return p;
}
