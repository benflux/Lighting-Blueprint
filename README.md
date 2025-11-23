# Mode-based Lighting Control Blueprint

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint URL.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fbenflux%2FLighting-Blueprint%2Fblob%2Fmain%2Fflux_lighting.yaml)

This Home Assistant blueprint provides automated lighting control based on the state of the lights themselves. When a light is turned on, it automatically adjusts the brightness and color temperature according to the current time of day (Day, Evening, Night).

## Features

- **Mode-based Control**: Different settings for Day, Evening, and Night modes.
- **Manual Override**: Prevents automation from changing settings if an override helper is active.
- **Lux Condition**: Optional check to only apply settings if the room is dark enough.
- **Loop Prevention**: Triggers on light state change (Off -> On) to avoid infinite loops.

## Installation

1.  Click the "Open your Home Assistant instance and show the blueprint import dialog" button above, OR copy `flux_lighting.yaml` to your Home Assistant `blueprints/automation/` directory.
2.  Reload Automations.
3.  Create a new automation using the "Mode-based Lighting Control" blueprint.
