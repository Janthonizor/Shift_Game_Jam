export const Levels = [

    {
        id: 0,
        name: "Orb Field",

        background: {
            x: 5000,
            y: 5000,
            width: 10000,
            height: 10000
        },

        start: {
            position: {
                x: 32,
                y: 32
            },

            speed: {
                x: 100,
                y: 100
            }
        },

        createOrbs() {

            return Array.from({ length: 12 * 12 }, (_, i) => {

                const columns = 12;
                const spacing = 800;
                const offset = 400;

                const col = i % columns;
                const row = Math.floor(i / columns);

                return {
                    x: offset + col * spacing +
                        (Math.random() * 200 - 100),

                    y: offset + row * spacing +
                        (Math.random() * 200 - 100),

                    width: 200,
                    height: 200,

                    texture: null,
                    inRange: false,
                    alignment: 0,
                    spinAngle: 0
                };

            });

        },

        checkpoints: []

    }

];
