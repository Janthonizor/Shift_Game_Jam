export const ditheringSettings = {
    enabled: true,
    matrixSize: 8,

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

    cutoffStrength: 0.5,
    cutoffOffset: 1.0
};

ditheringSettings.cutoffs = Array.from(
    { length: ditheringSettings.palette.length - 1 },
    (_, i) =>
        ((i + 1) / ditheringSettings.palette.length)
        * ditheringSettings.cutoffOffset
);