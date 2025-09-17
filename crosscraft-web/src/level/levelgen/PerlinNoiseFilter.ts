import { Random } from "../../../lib/UTIL/Random";


export class PerlinNoiseFilter {
    private static readonly FUZZINESS: number = 16;
    private readonly octave: number;

    constructor(octave: number) {
        this.octave = octave;
    }

    public read(width: number, height: number): number[] {
        var random: Random = new Random();

        var table: number[] = new Array<number>(width * height).fill(0);

        for (var step = width >> this.octave; step > 1; step /= 2) {
            var max = 256 * (step << this.octave);
            var halfStep = step / 2;

            for (var y = 0; y < height; y += step) {
                for(var x = 0; x < width; x += step) {
                    var value = table[x % width + y % height * width];

                    var stepValueX: number = Math.floor(table[(x + step) % width + y % height * width]);
                    var stepValueY: number = Math.floor(table[x % width + (y + step) % height * width]);
                    var stepValueXY: number = Math.floor(table[(x + step) % width + (y + step) % height * width]);

                    var mutatedValue: number = Math.floor((value + stepValueY + stepValueX + stepValueXY) / 4 + random.nextInt(max * 2) - max);

                    table[x + halfStep + (y + halfStep) * width] = mutatedValue;
                }
            }

            for (var y = 0; y < height; y += step) {
                for(var x = 0; x < width; x += step) {

                    var value: number = Math.floor(table[x + y * width]);

                    var stepValueX: number = Math.floor(table[(x + step) % width + y * width]);
                    var stepValueY: number = Math.floor(table[x + (y + step) % width * width]);

                    var halfStepValueXPos: number = Math.floor(table[(x + halfStep & width - 1) + (y + halfStep - step & height - 1) * width]);
                    var halfStepValueYPos: number = Math.floor(table[(x + halfStep - step & width - 1) + (y + halfStep & height - 1) * width]);

                    var halfStepValue: number = Math.floor(table[(x + halfStep) % width + (y + halfStep) % height * width]);
                    
                    var mutatedValueX: number = Math.floor((value + stepValueX + halfStepValue + halfStepValueXPos) / 4 + random.nextInt(max * 2) - max);
                    var mutatedValueY: number = Math.floor((value + stepValueY + halfStepValue + halfStepValueYPos) / 4 + random.nextInt(max * 2) - max);

                    table[x + halfStep + y * width] = mutatedValueX;
                    table[x + (y + halfStep) * width] = mutatedValueY;
                }
            }
        }

        var result: number[] = new Array<number>(width * height);

        for (var y = 0; y < height; ++y) {
            for (var x = 0; x < width; ++x) {
                result[x + y * width] = table[x % width + y % height * width] / 512 + 128;
            }
        }

        return result;
    }

}