    /*export const ditheringSettings = {
    enabled: true,
    matrixSize: 4,

    bayerMatrix: [
         0, 48, 12, 60,  3, 51, 15, 63,
        32, 16, 44, 28, 35, 19, 47, 31,
         8, 56,  4, 52, 11, 59,  7, 55,
        40, 24, 36, 20, 43, 27, 39, 23,
         2, 50, 14, 62,  1, 49, 13, 61,
        34, 18, 46, 30, 33, 17, 45, 29,
        10, 58,  6, 54,  9, 57,  5, 53,
        42, 26, 38, 22, 41, 25, 37, 21
    ],

    palette: [
        [0, 0, 0],
        [70, 0, 20],
        [50, 50, 140],
        [240, 190, 210],
        [255, 255, 200]
    ],


    cutoffStrength: 0.4,
    cutoffOffset: 1.0
};

ditheringSettings.cutoffs = Array.from(
    { length: ditheringSettings.palette.length - 1 },
    (_, i) =>
        ((i + 1) / ditheringSettings.palette.length)
        * ditheringSettings.cutoffOffset
);
*/


export const ditheringSettings = {
    enabled: true,
    matrixSize: 4,

    bayerMatrix: [
         0,  8,  2, 10,
        12,  4, 14,  6,
         3, 11,  1,  9,
        15,  7, 13,  5
    ],

    backgroundPalette: [
        [8, 13, 32],
        [20, 35, 68],
        [36, 71, 107],
        [57, 113, 138],
        [105, 165, 160],
        [165, 201, 174],
        [214, 220, 192],
        [240, 232, 203]
    ],

    foregroundPalette: [
        [32, 13, 50],
        [66, 20, 79],
        [112, 36, 95],
        [164, 61, 112],
        [214, 91, 121],
        [242, 138, 131],
        [255, 192, 154],
        [255, 240, 201]
    ]
};