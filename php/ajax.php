<?php
// 返回 ajax 数据

$page = _getRequest('page');
$action = _getRequest('action');

if( ! $page) exit;
if( ! $action) exit;

// 模拟异步网络延时
//sleep(1);
//usleep(700000); // 微秒(0.7秒)

$list = array();
$result = array();
$result['code'] = 0;
$result['message'] = '返回数据成功';

// 数据库配置
include_once "ezSQL/shared/ez_sql_core.php";
include_once "ezSQL/mysql/ez_sql_mysql.php";

/*-----------------------------------------------
 如果使用此文件，请先务必根据自己的数据库填写以下信息！
-----------------------------------------------*/
$db = new ezSQL_mysql('数据库用户名','密码','数据库名','数据库地址', 'utf8');



if ($page == 'regionPicker'){
    if ($action == 'getRegions'){
        $parentId = _getRequest('parentId'); // 父级ID
        $includeAllChild = _getRequest('includeAllChild'); // 是否含所有子级
        $table = 'region'; // 表名


        $regions = getRegionsData($parentId);
        // 
        if($parentId == '0'){
            $list = $regions;
        }
        else{
            if($includeAllChild == 'true'){
                $list = getRegionsChildren($parentId);
            }
            else {
                $list = $regions;
            }
        }
    }
}
elseif($page == 'xxxxxx'){
    $result['code'] = 1;
}

//shuffle($list);
$result['data'] = $list;
$json = json_encode($result, JSON_NUMERIC_CHECK); // 数字默认是加双引号输出，即作为字符串输出，加上参数 JSON_NUMERIC_CHECK 表示不加双引号

// 跨域相关
$callback = _getRequest('callback');
if($callback){
    echo $callback . '(' . $json . ')'; // 同IP，不同端口号也算跨域
}
else{
    echo $json;
}

// 获取请求参数
function _getRequest($key){
    $val = isset($_REQUEST[$key]) ? $_REQUEST[$key] : null; 
    return $val; 
}
// 获取某一级地区
function getRegionsData($parentId){
    global $db, $table;
    $regions = $db->get_results("SELECT `id`, `parentId`, `code`, `name`, `displayOrder` FROM {$table} WHERE `parentId` = {$parentId} ORDER BY `displayOrder` ASC, `id` ASC");
    return $regions;
}
// 获取所有下级地区(返回的数据都是同一级，由前端分组)
function getRegionsChildren($parentId){
    $list = array();
    $regions = getRegionsData($parentId);
    if(count($regions) > 0){
        foreach ($regions as $region){
            $list[] = $region;
            $regionsChildren = getRegionsChildren($region->id);
            if(count($regionsChildren) > 0){
                foreach ($regionsChildren as $child){
                    $list[] = $child;
                }
            }
        }
    }
    return $list;
}

