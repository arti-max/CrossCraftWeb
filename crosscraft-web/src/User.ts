

export class User {
    public username: string;
    public sessionid: string;

    constructor(n: string, s: string) {
        this.username = n;
        this.sessionid = s;
    }
}