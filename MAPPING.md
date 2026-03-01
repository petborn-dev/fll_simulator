# GearsBot FLL2024 Object → Mission Mapping

## Coordinate System
- GearsBot field: 100x100 cm, center at (0,0)
- X: -50 (left) to +50 (right)
- Z: -50 (front/launch) to +50 (back/top)
- Y: height above ground
- Each "object" has a parent position, sub-objects are relative to parent
- Parent position (0,0,20) means sub-object coords are absolute (offset by parent)

## Key Insight
GearsBot objects are NOT 1:1 with missions. Some objects are compound groups
containing parts for a single mission, while others are standalone boxes.
Most objects are on the LEFT half of the field (X < 0), suggesting GearsBot
may only model one half for a dual-table setup, or the right-side missions
are simpler and use fewer objects.

## Object → Mission Mapping

| GearsBot Obj | Parts | Center Position | Colors | Likely Mission | Confidence |
|-------------|-------|-----------------|--------|---------------|------------|
| 0 | 26 | (-39.7, 9.2) | blue/gray/green/yellow | M01 Coral Nursery | Medium |
| 1 | 1 (box) | (-83.4, 1.6) | gray | M02 Shark | Medium |
| 2 | 19 cyl | (-43.2, 4.0) | gray/beige | M03 Coral Reef | Medium |
| 3 | 18 | (-20.8, 7.6) | green/gray | M06 Raise the Mast | Medium |
| 4 | 3 | (-27.8, 1.2) | gray/blue/pink | M05 Angler Fish (part A) | Medium |
| 5 | 3 | (-32.6, 1.2) | gray/blue/purple | M05 Angler Fish (part B) | Medium |
| 6 | 3 | (33.8, 1.2) | green/gray/blue | M09 Unexpected Encounter | Low |
| 7 | 17 | (-40.7, 3.6) | gray/green/lime | M07 Kraken's Treasure | Medium |
| 8 | 6 | (-43.1, 2.2) | gray/white | M08 Artificial Habitat | Medium |
| 9 | 15 | (-43.1, 3.9) | gray/orange/yellow | M10 Send Over Submersible | Medium |
| 10 | 22 | (1.2, 6.0) | green/gray/white | M11 Sonar Discovery | Medium |
| 11 | 1 (transparent) | (-13.4, 1.2) | transparent green | Trigger zone/marker | Low |
| 12 | 18 | (-11.6, 3.8) | gray/green/red | M12 Feed the Whale | Medium |
| 13 | 1 (box) | (-31.2, 2.0) | dark gray | M14 platform | Medium |
| 14 | 1 (box) | (-30.8, 0.8) | brown, has mass | M14 movable sample | Medium |

## Missing Missions
Not clearly represented in GearsBot objects:
- M04 Scuba Diver
- M09 Unexpected Encounter (maybe Obj 6?)
- M13 Shipping Lanes
- M14 Sample Collection (Obj 13+14 are partial)
- M15 Research Vessel

## Conclusion
GearsBot provides good compound primitive data for ~10 missions.
The remaining 5 missions will need to be built from scratch using compound primitives.
The sub-part data (positions, sizes, colors, physics) is directly usable after
coordinate conversion from GearsBot cm to our meter-based system.
