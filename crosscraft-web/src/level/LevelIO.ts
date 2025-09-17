import pako from 'pako';
import type { CrossCraft } from "../CrossCraft";
import type { Level } from "./Level";



export class LevelIO {
    private cc: CrossCraft;

    constructor(cc: CrossCraft) {
        this.cc = cc;
    }
    
    /**
    * Загружает уровень с удаленного сервера.
    * @param level Объект уровня, куда будут загружены данные.
    * @param serverUrl URL сервера.
    * @param user Имя пользователя (для загрузки карт конкретного игрока).
    * @param levelId ID уровня на сервере.
    * @return true, если загрузка прошла успешно.
    */
     public async loadOnline(level: Level, serverUrl: string, user: string, levelId: number): Promise<boolean> {
        await this.cc.beginLevelLoading("Loading level"); // Показываем экран загрузки

        try {
            this.cc.levelLoadUpdate("Connecting...");
            const url = `http://${serverUrl}/level/load.html?id=${levelId}&user=${user}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            this.cc.levelLoadUpdate("Loading...");
            const arrayBuffer = await response.arrayBuffer();

            const view = new DataView(arrayBuffer);
            if (view.getUint8(0) !== 0x1f || view.getUint8(1) !== 0x8b) {
                const errorMessage = new TextDecoder().decode(arrayBuffer);
                this.cc.levelLoadUpdate(`Failed: ${errorMessage}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return false;
            }
            return this.load(level, arrayBuffer);

        } catch (e) {
            console.error(e);
            await this.cc.levelLoadUpdate("Failed!");
            await new Promise(resolve => setTimeout(resolve, 1000));
            return false;
        }
    }

    /**
     * Загружает уровень из бинарных данных (ArrayBuffer).
     * @param level Объект уровня для заполнения.
     * @param data Входные данные (GZIP-сжатый ArrayBuffer).
     * @returns true, если загрузка успешна.
     */
    public load(level: Level, data: ArrayBuffer): boolean {
        this.cc.levelLoadUpdate("Reading..");
        try {
            // 1. Распаковываем GZIP
            const decompressedData: Uint8Array = pako.ungzip(data);
            
            // 2. Создаем DataView для удобного чтения бинарных данных
            const view = new DataView(decompressedData.buffer);
            let offset = 0; // Смещение для чтения из буфера

            // 3. Читаем данные последовательно, как в Java DataInputStream

            // Читаем магическое число (int)
            const magicNumber = view.getInt32(offset, false); // false = big-endian
            offset += 4;
            if (magicNumber !== 656127880) {
                throw new Error("Invalid magic number");
            }

            // Читаем версию формата (byte)
            const version = view.getInt8(offset);
            offset += 1;
            if (version > 1) {
                throw new Error(`Unsupported format version: ${version}`);
            }

            // Функция для чтения UTF-строк (сначала длина, потом сама строка)
            const readUTF = (): string => {
                const length = view.getInt16(offset, false);
                offset += 2;
                const strBytes = new Uint8Array(decompressedData.buffer, offset, length);
                offset += length;
                return new TextDecoder().decode(strBytes);
            };
            
            const name = readUTF();
            const creator = readUTF();

            // Читаем время создания (long). JavaScript не имеет 64-битных int, используем BigInt.
            const creationTime = view.getBigInt64(offset, false);
            offset += 8;
            
            const width = view.getInt16(offset, false);
            offset += 2;
            const height = view.getInt16(offset, false);
            offset += 2;
            const depth = view.getInt16(offset, false);
            offset += 2;
            
            // Читаем массив блоков
            const blocksLength = width * height * depth;
            const blocks = new Uint8Array(decompressedData.buffer, offset, blocksLength);

            
            // 4. Заполняем объект Level
            level.setData(width, depth, height, blocks as unknown as number[]);
            level.name = name;
            level.creator = creator;
            level.creationTime = creationTime; // Убедись, что тип поля в Level поддерживает BigInt

            return true;

        } catch (e) {
            console.error("Failed to parse level data:", e);
            return false;
        }
    }

    /**
    * Сохраняет уровень на сервере через HTTP POST.
    * @param level уровень для сохранения
    * @param serverUrl адрес сервера
    * @param username имя пользователя
    * @param sessionId идентификатор сессии
    * @param levelName имя уровня для сохранения
    * @param progress прогресс сохранения (байт)
    * @param levelId айди слота
    * @return true, если сохранение успешно
    */
    public async saveOnline(level: Level, serverUrl: string, username: string, sessionId: string | null, levelName: string, levelId: number): Promise<boolean> {

        if (!sessionId) {
            sessionId = "";
        }

        this.cc.beginLevelLoading("Saving level");
        await this.sleep(1);
        
        try {
            this.cc.levelLoadUpdate("Compressing...");

            // Сериализация уровня в Uint8Array
            const compressedLevelData = this.serializeLevelToByteArray(level);

            this.cc.levelLoadUpdate("Connecting...");
            await this.sleep(100);

            // Формируем тело POST-запроса как бинарный пакет по очереди:
            // - username (UTF), sessionId (UTF), levelName (UTF)
            // - progress (byte) - зададим 0 если не нужен
            // - длина данных (int32)
            // - сами данные (Uint8Array)
            // Для кодирования UTF используем TextEncoder с длиной
            const encoder = new TextEncoder();

            function encodeUTF8WithLength(str: string): Uint8Array {
                const strBytes = encoder.encode(str);
                const lenBuf = new Uint8Array(2);
                const view = new DataView(lenBuf.buffer);
                view.setUint16(0, strBytes.length, false); // big-endian
                const combined = new Uint8Array(2 + strBytes.length);
                combined.set(lenBuf, 0);
                combined.set(strBytes, 2);
                return combined;
            }

            // Собираем весь корпус сообщения
            const usernameBytes = encodeUTF8WithLength(username);
            const sessionBytes = encodeUTF8WithLength(sessionId);
            const levelNameBytes = encodeUTF8WithLength(levelName);
            const progressByte = new Uint8Array([0]); // progress = 0

            const lengthBuf = new Uint8Array(4);
            const lengthView = new DataView(lengthBuf.buffer);
            lengthView.setUint32(0, compressedLevelData.byteLength, false); // big-endian
            const slotBuf = new Uint8Array(4);
            new DataView(slotBuf.buffer).setInt32(0, levelId, false); // big-endian

            // Общая длина POST-запроса
            const totalLength =
            usernameBytes.byteLength +
            sessionBytes.byteLength +
            levelNameBytes.byteLength +
            1 + // progressByte
            4 + // lengthBuf
            4 + // slotBuf
            compressedLevelData.byteLength;
            const body = new Uint8Array(totalLength);

            let offset = 0;
            body.set(usernameBytes, offset); offset += usernameBytes.byteLength;
            body.set(sessionBytes, offset); offset += sessionBytes.byteLength;
            body.set(levelNameBytes, offset); offset += levelNameBytes.byteLength;
            body.set(progressByte, offset); offset += 1;
            body.set(lengthBuf, offset); offset += 4;
            body.set(slotBuf, offset); offset += 4;
            body.set(compressedLevelData, offset);

            // Делаем POST запрос с боди типа 'application/octet-stream'
            const response = await fetch(`http://${serverUrl}/level/save.html`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: body
            });

            // Проверяем ответ сервера
            if (!response.ok) {
                this.cc.levelLoadUpdate(`Failed! Server returned status ${response.status}`);
                await this.sleep(1000);
                return false;
            }

            const text = await response.text();

            if (text.trim().toLowerCase() !== "ok") {
                this.cc.levelLoadUpdate(`Failed: ${text.trim()}`);
                await this.sleep(1000);
                return false;
            }
            return true;
        } catch (e) {
            console.error(e);
            this.cc.levelLoadUpdate("Failed!");
            await this.sleep(1000);
            return false;
        }
    }

    private serializeLevelToByteArray(level: Level): Uint8Array {
        // Тут сериализация уровня в формат GZIP, аналогичная Java версии

        // Создаем буфер для данных
        const outputChunks: Uint8Array[] = [];

        // Поможет собрать в единую последовательность байт
        function writeInt32(value: number) {
            const buf = new Uint8Array(4);
            new DataView(buf.buffer).setInt32(0, value, false);
            outputChunks.push(buf);
        }

        function writeInt16(value: number) {
            const buf = new Uint8Array(2);
            new DataView(buf.buffer).setInt16(0, value, false);
            outputChunks.push(buf);
        }

        function writeByte(value: number) {
            const buf = new Uint8Array(1);
            buf[0] = value;
            outputChunks.push(buf);
        }

        function writeUTF(str: string) {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(str);
            writeInt16(encoded.length);
            outputChunks.push(encoded);
        }

        function writeInt64(value: bigint) {
            const buf = new Uint8Array(8);
            const view = new DataView(buf.buffer);
            // big-endian
            view.setBigInt64(0, value, false);
            outputChunks.push(buf);
        }

        // Заголовок
        writeInt32(656127880);     // Магическое число
        writeByte(1);              // Версия формата
        writeUTF(level.name);
        writeUTF(level.creator);
        writeInt64(level.creationTime as bigint);

        // Размеры
        writeInt16(level.width);
        writeInt16(level.height);
        writeInt16(level.depth);


        // Массив блоков
        outputChunks.push(new Uint8Array(level.blocks));

        // Склеиваем все чанки
        const rawData = concatUint8Arrays(outputChunks);

        // Сжимаем с помощью pako.gzip
        const gzipped = pako.gzip(rawData);
        return gzipped;

    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}