load('lib/jslint/jslint.js');

var src = readFile('offline.js');

JSLINT(src, { browser: true, undef: true, eqeqeq: true, regexp: true, newcap: true, maxerr: 100 });

var ok = {
//	"Use '===' to compare with 'null'.": true,
//	"Use '!==' to compare with 'null'.": true,
	"'window' is not defined.": true
};

var e = JSLINT.errors, found = 0, w;

for (var i=0; i<e.length; i++) {
	w = e[i];

	if (!ok[ w.reason ]) {
		found++;
		print(w.evidence);
		print(new Array(w.character).join(' ')+'^');
		print('--> '+w.reason+' (' + w.line + ', ' + w.character + ')\n');
	}
}

print( (found?found:'No') + ' issue'+(found === 1 ? '' : 's')+' found.');
