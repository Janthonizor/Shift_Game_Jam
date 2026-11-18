# Shift_Game_Jam

MAIN_MENU → LOADING	Prepare selected level
LOADING → PLAYING	Initialize gameplay
PLAYING → PAUSED	Freeze gameplay
PAUSED → PLAYING	Resume exactly where we left off
PLAYING → LEVEL_FAILED	Freeze gameplay, preserve level
PLAYING → LEVEL_COMPLETED	Freeze gameplay, preserve level
LEVEL_FAILED → LOADING	Reload current level
LEVEL_COMPLETED → LOADING	Load next level
Any menu state → MAIN_MENU	Unload active level

