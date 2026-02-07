export namespace main {
	
	export class CategoryInfo {
	    objNo: number;
	    caption: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new CategoryInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.objNo = source["objNo"];
	        this.caption = source["caption"];
	        this.path = source["path"];
	    }
	}
	export class Config {
	    base_url: string;
	    tenant_name: string;
	    category_no: number;
	    category_name: string;
	    auth_type: string;
	    is_set_up: boolean;
	    default_archive: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.base_url = source["base_url"];
	        this.tenant_name = source["tenant_name"];
	        this.category_no = source["category_no"];
	        this.category_name = source["category_name"];
	        this.auth_type = source["auth_type"];
	        this.is_set_up = source["is_set_up"];
	        this.default_archive = source["default_archive"];
	    }
	}
	export class FileInfo {
	    name: string;
	    path: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	    }
	}
	export class ShareHistoryEntry {
	    filename: string;
	    url: string;
	    linkId: string;
	    docNo: number;
	    createdAt: string;
	    expiresAt: string;
	    hasPassword: boolean;
	    categoryName: string;
	
	    static createFrom(source: any = {}) {
	        return new ShareHistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.url = source["url"];
	        this.linkId = source["linkId"];
	        this.docNo = source["docNo"];
	        this.createdAt = source["createdAt"];
	        this.expiresAt = source["expiresAt"];
	        this.hasPassword = source["hasPassword"];
	        this.categoryName = source["categoryName"];
	    }
	}
	export class ShareRequest {
	    files: string[];
	    password: string;
	    expiryDays: number;
	    customExpiry: string;
	
	    static createFrom(source: any = {}) {
	        return new ShareRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.files = source["files"];
	        this.password = source["password"];
	        this.expiryDays = source["expiryDays"];
	        this.customExpiry = source["customExpiry"];
	    }
	}
	export class ShareResponse {
	    url: string;
	    docNo: number;
	    expiresAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new ShareResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.docNo = source["docNo"];
	        this.expiresAt = source["expiresAt"];
	    }
	}
	export class TestConnectionRequest {
	    baseURL: string;
	    tenantName: string;
	    authType: string;
	    username: string;
	    password: string;
	    token: string;
	
	    static createFrom(source: any = {}) {
	        return new TestConnectionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.baseURL = source["baseURL"];
	        this.tenantName = source["tenantName"];
	        this.authType = source["authType"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.token = source["token"];
	    }
	}

}

