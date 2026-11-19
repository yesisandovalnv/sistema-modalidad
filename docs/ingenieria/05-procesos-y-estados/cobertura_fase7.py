"""Clasificación explícita por vista; la pertenencia a familia nunca acredita recorrido."""
DIRECT={
 'DIA-USR-060':'USR-001 USR-003 USR-004 USR-005 USR-009',
 'DIA-USR-061':'USR-002 USR-006',
 'DIA-ACA-060':'ACA-001 ACA-002 DOC-008 POS-028',
 'DIA-SYS-003':'POS-001 POS-011', 'DIA-POS-060':'POS-002 POS-010 POS-024 POS-025',
 'DIA-POS-061':'POS-003 POS-012', 'DIA-POS-062':'POS-003 POS-013',
 'DIA-POS-063':'POS-005 POS-014 POS-015',
 'DIA-POS-064':'USR-008 POS-004 POS-017',
 'DIA-DOC-060':'DOC-001 DOC-006','DIA-DOC-061':'DOC-003',
 'DIA-DOC-062':'DOC-002','DIA-DOC-063':'DOC-004 DOC-005',
 'DIA-POS-065':'POS-006 POS-020','DIA-POS-066':'POS-021 POS-007',
 'DIA-POS-067':'POS-023 POS-026 POS-027',
 'DIA-NOT-060':'NOT-001 NOT-002','DIA-REP-060':'REP-001 REP-003 REP-004',
 'DIA-USR-070':'USR-001','DIA-USR-071':'USR-003',
 'DIA-SYS-004':'POS-001','DIA-DOC-070':'DOC-001',
 'DIA-POS-070':'POS-003','DIA-POS-071':'POS-017',
 'DIA-POS-072':'POS-006 POS-020','DIA-POS-073':'POS-007',
 'DIA-POS-074':'POS-008','DIA-NOT-070':'',
 'DIA-SYS-005':'POS-001 POS-011 POS-024','DIA-POS-080':'',
 'DIA-POS-081':'POS-003 POS-013','DIA-DOC-080':'DOC-002',
 'DIA-DOC-081':'DOC-001','DIA-DOC-082':'DOC-004',
 'DIA-POS-082':'POS-006','DIA-NOT-080':'NOT-002',
 'DIA-POS-083':'POS-023','DIA-POS-084':'POS-026',
 'DIA-EG-080':'EG-001','DIA-DIP-080':'DIP-001','DIA-POS-085':'POS-004 POS-017',
 'DIA-EA-080':'EA-001 EA-002','DIA-PG-060':'PG-002','DIA-TG-060':'TG-001',
 'DIA-TD-060':'TD-003','DIA-EG-060':'EG-002','DIA-EA-060':'EA-003','DIA-DIP-060':'DIP-002',
 'DIA-PG-070':'PG-002',
}
ABSENT={('DIA-USR-070','UC-USR-004'),('DIA-USR-071','UC-USR-004'),
        ('DIA-PG-070','UC-PG-001')}

def classify(view,process):
    direct=['UC-'+x for x in DIRECT[view['id']].split()]
    assert set(direct)<=set(process['cases'])
    view['context_cases']=list(process['cases'])
    view['cases']=direct
    view['coverage']={u:('DIRECTA' if u in direct else 'NO REPRESENTADO' if (view['id'],u) in ABSENT
                        else 'PENDIENTE DE VERIFICACIÓN' if u.startswith('UC-ACA-') and view['id']=='DIA-ACA-060'
                        else 'REFERENCIA CONTEXTUAL') for u in process['cases']}
    view['coverage_limit']='DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.'
