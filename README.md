# Mode-based Lighting Control Blueprint

This Home Assistant blueprint provides automated lighting control based on the state of the lights themselves. When a light is turned on, it automatically adjusts the brightness and color temperature according to the current time of day (Day, Evening, Night).

## Features

- **Mode-based Control**: Different settings for Day, Evening, and Night modes.
- **Manual Override**: Prevents automation from changing settings if an override helper is active.
- **Lux Condition**: Optional check to only apply settings if the room is dark enough.
- **Loop Prevention**: Triggers on light state change (Off -> On) to avoid infinite loops.

## Installation

1.  Copy `flux_lighting.yaml` to your Home Assistant `blueprints/automation/` directory.
2.  Reload Automations.
3.  Create a new automation using the "Mode-based Lighting Control" blueprint.
