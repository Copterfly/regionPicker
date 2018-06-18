<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-touch-fullscreen" content="yes" />
<meta name="format-detection" content="telephone=no" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
<title>ez_sql_mysql</title>
<meta name="keywords" content="" />
<meta name="description" content="" />
</head>
<body>

<?php

	/**********************************************************************
	*  ezSQL initialisation for mySQL
	*/

	// Include ezSQL core
	include_once "../shared/ez_sql_core.php";

	// Include ezSQL database specific component
	include_once "ez_sql_mysql.php";

	// Initialise database object and establish a connection
	// at the same time - db_user / db_password / db_name / db_host
	$db = new ezSQL_mysql('db_user','db_password','db_name','db_host');

	/**********************************************************************
	*  ezSQL demo for mySQL database
	*/

	// Demo of getting a single variable from the db
	// (and using abstracted function sysdate)
	$current_time = $db->get_var("SELECT " . $db->sysdate());
	print "ezSQL demo for mySQL database run @ $current_time";

	// Print out last query and results..
	$db->debug();

	// Get list of tables from current database..
	$my_tables = $db->get_results("SHOW TABLES",ARRAY_N);

	// Print out last query and results..
	$db->debug();

	// Loop through each row of results..
	foreach ( $my_tables as $table )
	{
		// Get results of DESC table..
		$db->get_results("DESC $table[0]");

		// Print out last query and results..
		$db->debug();
	}
	// region
	$table = 'region';
	$parentId = 0;
	$regions = $db->get_results("SELECT `Id`, `ParentId`, `Code`, `Name`, `DisplayOrder` FROM {$table} WHERE `ParentId` = {$parentId} ORDER BY `DisplayOrder` ASC");
	$db->debug();
	//$regions = $db->get_results("SELECT `Id`, `ParentId`, `Code`, `Name`, `DisplayOrder` FROM {$table} WHERE `ParentId` IS NULL ORDER BY `DisplayOrder` ASC");
	//$db->debug();

?>
</body>
</html>
