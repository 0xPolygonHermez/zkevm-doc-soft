/* lexical grammar */
%lex
%%
\;[^\n\r]*                                      { /* Comments */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/     { /* Multiline Comments */  }
[ \t]+                                          { /* Empty spaces and tabs */ }
[\r\n]+                                         { return "LF";} /* Matches empty spaces after lines */
((0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*))n  { yytext = BigInt(yytext.replace(/[\_n]/g, "")); return 'NUMBERL'; }        /* Big Ints */
(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*)     { yytext = Number(yytext.replace(/\_/g, "")); return 'NUMBER'; }            /* Normal Ints */
(\$(\{[^\}]*\})?)                               { yytext = yytext.length == 1 ? "" : yytext.slice(2, -1); return 'TAG'; }   /* Matches free inputs: TAGS */
A                                               { return 'A'; }
B                                               { return 'B'; }
zkPC                                              { return 'zkPC'; }
JMP                                             { return 'JMP'; }
JMPZ                                            { return 'JMPZ'; }
ADD                                             { return 'ADD'; }
[a-zA-Z_][a-zA-Z$_0-9]*                         { return 'IDENTIFIER'; }
\:                                              { return ':'; }
\,                                              { return ','}
\(                                              { return '('}
\)                                              { return ')'}
\-                                              { return '-'}
\=\>                                            { return '=>' }
<<EOF>>                                         { return 'EOF'; }
/lex

%left '+' '-'
%{
function setLine(dst, first) {
    dst.line = first.first_line;
}
%}

%start allStatements

%% /* language grammar */

allStatements
    : statementList EOF
        {
            $$ = $1;
            return $$;
        }
    ;

statementList
    : statementList statement
        {
            if ($2) $1.push($2);
            $$ = $1;
        }
    | statement
        {
            if ($1) {
                $$ = [$1];
            } else {
                $$=[];
            }
        }
    ;

statement
    : step
        {
            $$ = $1;
        }
    | label
        {
            $$ = $1;
        }
    | LF
        {
            $$ = null;
        }
    ;

step
    : assignment ':' opList LF
        {
            $$ = {type: "step", assignment: $1, ops: $3};
            setLine($$, @1)
        }
    | assignment LF
        {
            $$ = {type: "step", assignment: $1, ops: []};
            setLine($$, @1)
        }
    | ':' opList  LF
        {
            $$ = {type: "step", assignment: null, ops: $2}
            setLine($$, @1)
        }
    ;

label
    : IDENTIFIER ':'
        {
            $$ = {type: "label", identifier: $1};
            setLine($$, @1)
        }
    ;

assignment
    : inSignedReg '=>' regsList
        {
            $$ = {in: $1, out: $3}
        }
    | inSignedReg
        {
            $$ = {in: $1, out: []}
        }
    ;

inSignedReg
    : '-' inReg
        {
            $$ = {type: 'neg', values: [$2]}
        }
    | inReg
        {
            $$ = $1
        }
    ;

inReg
    : TAG
        {
            $$ = {type: 'TAG' , tag: $1}
        }
    | reg
        {
            $$ = {type: 'REG' , reg: $1}
        }
    | NUMBER
        {
            $$ = {type: 'CONST' , const: $1}
        }
    | NUMBERL
        {
            $$ = {type: 'CONSTL' , const: $1}
        }
    ;

regsList
    : regsList ',' reg
        {
            $1.push($3)
        }
    | reg
        {
            $$ = [$1]
        }
    ;

opList
    : opList ',' op
        {
            $1.push($3);
            $$ = $1
        }
    | op
        {
            $$ = [$1]
        }
    ;

op
    : JMPZ '(' IDENTIFIER ')'
        {
            $$ = {JMPZ: 1, JMP: 0, offset: $3 }
        }
    | JMP '(' IDENTIFIER ')'
    {
        $$ = {JMPZ:0, JMP: 1, offset: $3 }
    }
    | ADD
        {
            $$ = { ADD: 1 }
        }
    ;

reg
    : A
    | B
    | zkPC
    ;