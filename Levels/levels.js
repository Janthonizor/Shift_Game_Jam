export const Levels = [

    {
        id: 0,
        name: "Orb Field 1",

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

                    radius: 80,
                    inRange: false,
                    alignment: 0,
                    spinAngle: 0
                };

            });

        },

        checkpoints: []

    },
    {
        id: 1,
        name: "Orb Field 2",

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

                    radius: 80,
                    inRange: false,
                    alignment: 0,
                    spinAngle: 0
                };

            });

        },

        checkpoints: []

    },


];


