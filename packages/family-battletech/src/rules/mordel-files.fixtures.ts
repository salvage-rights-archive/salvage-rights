// Made-up files in the shape mordel.net lets a member download, for tests. None is a real design.
// Made-up 'Mechs in the shape of the files mordel.net lets a member download. Each location's list is padded to twelve slots.
export const SECTIONS: Record<string, string> = { LA: "Left Arm", RA: "Right Arm", LT: "Left Torso", RT: "Right Torso", CT: "Center Torso", HD: "Head", LL: "Left Leg", RL: "Right Leg" };
export const EMPTY = "-Empty-";
export const ARM = ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"];
export const LEG = ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"];
export function sections(lists: Partial<Record<string, string[]>>): string {
  return Object.entries(SECTIONS)
    .map(([code, name]) => {
      const lines = lists[code] ?? [];
      return `${name}:\n${[...lines, ...Array<string>(Math.max(0, 12 - lines.length)).fill(EMPTY)].join("\n")}\n`;
    })
    .join("\n");
}
export const CENTER = ["Fusion Engine", "Fusion Engine", "Fusion Engine", "Gyro", "Gyro", "Gyro", "Gyro", "Fusion Engine", "Fusion Engine", "Fusion Engine"];
export const HEAD = ["Life Support", "Sensors", "Cockpit", EMPTY, "Sensors", "Life Support"];

export const STRIDER = `generator:Mordel.Net Code Release 2.26.30 on 25-Nov-2026
chassis:Test Strider
model:TS-1
source:Custom Mordel.Net Units

Config:Biped
TechBase:Inner Sphere
Era:3058
Rules Level:2
role:Skirmisher

Mass:40
Engine:160 Fusion Engine(IS)
Structure:Standard
Myomer:Standard

Heat Sinks:10 Single
Walk MP:4
Jump MP:0

Armor:Standard(Inner Sphere)
LA Armor:6
RA Armor:6
LT Armor:8
RT Armor:8
CT Armor:12
HD Armor:9
LL Armor:8
RL Armor:8
RTL Armor:3
RTR Armor:3
RTC Armor:4

Weapons:3
Medium Laser, Right Arm
Medium Laser, Left Arm
AC/5, Right Torso

${sections({
  LA: [...ARM.slice(0, 3), "Medium Laser"],
  RA: [...ARM, "Medium Laser"],
  LT: ["Heat Sink", "Heat Sink"],
  RT: ["AC/5", "AC/5", "AC/5", "AC/5", "Heat Sink", "Heat Sink", "AC/5 Ammo"],
  CT: [...CENTER, "Jump Jet", "Heat Sink"],
  HD: HEAD,
  LL: LEG,
  RL: LEG,
})}`;

export const BLK = `#Saved from Mordel.Net Code Release 2.26.30 on 25-Nov-2026
<BlockVersion>
1
</BlockVersion>

<UnitType>
Tank
</UnitType>

<Name>
Test Crawler
</Name>
`;

export const CRAWLER = `                 Alpha Strike Conversion

Name/Model:         "Test" Crawler
Technology:         Inner Sphere
Tonnage:            30
Configuration:      Wheeled Combat Vehicle

=======================================================================================================
Determine Unit Type
-------------------------------------------------------------------------------------------------------
Final Unit Type:                                                                                     CV

=======================================================================================================
Determine Weight/Size Class
-------------------------------------------------------------------------------------------------------
Final Weight/Size Class:                                                                              1

=======================================================================================================
Convert Movement and Movement Modes
-------------------------------------------------------------------------------------------------------
     Ground Target Movement Modifier at 12" is 2
-------------------------------------------------------------------------------------------------------
Final Movement and Movement Modes:                                                                 12"w

=======================================================================================================
Determine Short Range Damage Value
-------------------------------------------------------------------------------------------------------
Final Short Range Damage Value:                                                                       2
Final Medium Range Damage Value:                                                                      1
Final Long Range Damage Value:                                                                        0*
Final Armor Value:                                                                                    3
Final Structure Value:                                                                                2

=======================================================================================================
Determine Special Abilities
-------------------------------------------------------------------------------------------------------
  Unit is a Combat Vehicle                                                                    =    SRCH
  Unit mounts something                                                                       =    IF1

=======================================================================================================
Determine Point Value
-------------------------------------------------------------------------------------------------------
     Overheat Factor             0 (Overheat)                                    (+)   0.000  =   0.000
Final Point Value:                                                                                   14
`;

export const SPRINTER = CRAWLER.replace('"Test" Crawler', "Test Sprinter TSP-2A")
  .replace("Configuration:      Wheeled Combat Vehicle", "Designer:           Test Designer")
  .replace("Final Unit Type:                                                                                     CV", "Final Unit Type: BM")
  .replace('12"w', '8"/6"j')
  .replace("Final Long Range Damage Value:", "Final Extreme Range Damage Value: 0\nFinal Long Range Damage Value:")
  .replace("0 (Overheat)", "2 (Overheat)");

