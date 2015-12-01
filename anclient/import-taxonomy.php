<?php
function yield_only_primaries($labels) {
	$labels_h = array();
	foreach($labels as $lc=>$ld) {
		$labels_h[$lc] = $ld['primary'];
	}
	return $labels_h;
}

if (!empty($_REQUEST['taxo'])) {
	$nl = "\n";
	if ((strpos($_REQUEST['taxo'],"\r")!==false)&&(strpos($_REQUEST['taxo'],"\n")!==false)) {
		$nl = "\r\n";
	}
	else if (strpos($_REQUEST['taxo'],"\n")===false) {
		$nl = "\r";
	}
	$delim = (strpos($_REQUEST['taxo'],';')!==false) ? ';' : "\t";
	$lines = explode($nl,$_REQUEST['taxo']);
	$data = array();
	$cc = null;
	$cs = null;
	$supercat = 'G';
	$cat_now = false;
	$subcat_now = false;
	// ha kesz vannak a forditasok a tobbi nyelvre, ide kell bepakolni oket
	$default_pcs = array('hu'=>'db');
	$current_pcs = $default_pcs;
	foreach($lines as $line) {
		$line = trim($line);
		if (empty($line)) continue;
		$fields = explode($delim,$line);
		$type = (empty($fields[0])) ? 'term' : $fields[0];
		$key = null;
		for($i=1;$i<5;++$i) {
			if (!empty($fields[$i])) $key = strtolower(trim($fields[$i]));
		}
		if ($key===null) continue;
		if (is_numeric($key)) {
			$key = "num{$key}";
		}
		$legacy = (!in_array($fields[5], array('yes','no'))) ? 'no' : $fields[5];
		$langs = array_keys($default_pcs);
		$labels = array();
		$li = 6;
		for($i=0;$i<count($langs);++$i) {
			$syno = array();
			$label = $key;
			if (!empty($fields[$li+$i])) {
				$words = explode(',',$fields[$li+$i]);
				$label = trim(array_shift($words));
				if (!empty($words)) {
					foreach($words as $word) {
						$syno[] = trim($word);
					}
				}
			}
			$labels[$langs[$i]] = array('primary'=>$label,'synonyms'=>$syno);
		}
		if ($fields[0]=='scat') {
			$supercat = $key;
			$cc = null;
			$cs = null;
			$cat_now = false;
			$subcat_now = false;
		}
		else if ($fields[0]=='cat') {
			$cc = $key;
			$cs = null;
			$data[$cc] = array('label'=>yield_only_primaries($labels),'subcats'=>array(),'props'=>array(),'legacy'=>$legacy);
			$cat_now = true;
			$subcat_now = false;
			$current_pcs = array(array('key'=>'pcs','labels'=>$default_pcs,'legacy'=>'no'));
		}
		else if ($fields[0]=='subcat') {
			if ($cc===null) throw new Exception("WHAT THE FUCK");
			$cs = $key;
			$data[$cc]['subcats'][$cs] = array('label'=>yield_only_primaries($labels),'qtys'=>$current_pcs,'props'=>array(),'terms'=>array(),'legacy'=>$legacy);
			$cat_now = false;
			$subcat_now = true;
		}
		else if ($fields[0]=='qtyu') {
			if ($cc===null) throw new Exception("WHAT THE FUCK");
			if ($cs===null) {
				if ($cat_now===true) {
					$current_pcs = array();
				}
				$current_pcs[] = array('key'=>$key,'labels'=>yield_only_primaries($labels),'legacy'=>$legacy);
			}
			else {
				if ($subcat_now===true) {
					$data[$cc]['subcats'][$cs]['qtys'] = array();
				}
				$data[$cc]['subcats'][$cs]['qtys'][] = array('key'=>$key,'labels'=>yield_only_primaries($labels),'legacy'=>$legacy);
			}
			$cat_now = false;
			$subcat_now = false;
		}
		else if ($fields[0]=='prop') {
			if (($cc===null)&&($cs===null)) throw new Exception("WHAT THE FUCK");
			if ($cs===null) {
				$data[$cc]['props'][] = array('key'=>$key,'labels'=>$labels,'legacy'=>$legacy);
			} else {
				$data[$cc]['subcats'][$cs]['props'][] = array('key'=>$key,'labels'=>$labels,'legacy'=>$legacy);
			}
			$cat_now = false;
			$subcat_now = false;
		}
		else if ($fields[0]=='term') {
			if (($cc===null)||($cs===null)) throw new Exception("WHAT THE FUCK");
			$data[$cc]['subcats'][$cs]['terms'][] = array('key'=>$key,'labels'=>$labels,'legacy'=>$legacy,'code'=>$supercat.'/'.$cc.'/'.$cs.'/'.$key);
			$cat_now = false;
			$subcat_now = false;
		}
		else {
			throw new Exception("INVALID TYPE ({$fields[0]})");
		}
	}
	header("Content-type: text/plain; charset=UTF-8");
	echo "JSON forditas:\n\n";
	echo json_encode($data);
	file_put_contents("./dict.js", "var an_dict = ".json_encode($data).";\n");
	echo "\n\n\n\nPHP forras:\n\n";
	echo file_get_contents(__FILE__);
	exit;
}
header("Content-type: text/html; charset=UTF-8");
?>
<!DOCTYPE html>
<html>
<form method="post">
<label>Feed me, you glorious motherfucker:</label><br>
<textarea rows="10" cols="100" name="taxo"></textarea><br>
<i>copypaste a tábla 2. sorától innen: https://docs.google.com/spreadsheets/d/15nWwAbzCokXck4EDgSx-t3jjl_GoXkDYzjfKFfPD5oE</i>
<br><br>
<input type="submit" value="aww yiss">
</form>
</html>
