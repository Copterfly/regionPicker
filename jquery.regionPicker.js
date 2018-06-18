/*-----------------------------------------------
 $.fn.regionpicker() 地区选择插件
 by www.copterfly.cn 2017-12-12 星期二
 ------------------------------------------------
 插件提示额外两个方法：
 $('#xxx').regionPicker('reset'); // 重置 (把input的值设为空，把弹出的值也设为空，把所有select设为未选择，相当于用空值初始化插件)
 $('#xxx').regionPicker('destroy'); // 销毁 (解除插件调用)
-----------------------------------------------*/
;(function ($, window) {
    // 移动端工具类
    var _utilsMobile = {
        defaultMainId : 'mainContent',
        historyPush: function(id, main) { // 弹出其他层，隐藏主体 (主要为了弹出各种层，看起来打开新页面一样。支持浏览器后退事件)
            window.history.replaceState({ id: id, main: main }, '', '');
            window.history.pushState({}, '', '#' + id); // 添加 history
            this.showLayer($('#' + id));
            this.hideLayer($('#' + main));
            $(window).scrollTop(0);
        },
        historyPop: function() { // 显示主体，隐藏其他层
            var _this = this;
            window.onpopstate = function(e) {
                if(e.state && e.state.id) {
                    _this.showLayer($('#' + e.state.main));
                    _this.hideLayer($('#' + e.state.id));
                    $(window).scrollTop(0);
                }
            };
        },
        // 显示页面
        showLayer: function(node) {
            $(node).show().css('min-height', window.innerHeight);
        },
        // 隐藏页面
        hideLayer: function(node) {
            $(node).hide();
        },
        // 显示页面
        showFullPage: function(id, mainId) {
            this.defaultMainId = mainId ? mainId : this.defaultMainId;
            this.historyPush(id, this.defaultMainId); // 传参是为了兼容以前的老用法
        }
    };    
    if (typeof String.prototype.formatString !== 'function') {
        String.prototype.formatString = function() {
            if(arguments.length===0){return this;}for(var e=this,t=0;t<arguments.length;t++){e=e.replace(new RegExp("\\{"+t+"\\}","g"),arguments[t]);}return e;
        };
    }
    var $body = $('body'),
        _classes = {
            overlay : 'regionpicker-popup-overlay',
            rendered : 'regionPicker-rendered',
            trigger : 'js-regionPicker-trigger',
            triggerLoading : 'regionPicker-trigger-loading',
            reseted : 'regionPicker-reseted',
            current : 'current'
        },
        _countryPrefix = 'country_',
        _groupsNameRegExp = {
            'A-G': /[A-G]/,
            'H-K': /[H-K]/,
            'L-P': /[L-P]/,
            'Q-U': /[Q-U]/,
            'V-Z': /[V-Z]/
        };
    var _defaults = {
        getRegionUrl: null, // getRegionUrl: 例如: /Ajax/GetRegionChildList
        countryId: null, // 
        dataKeys: { // 地区数据每行的元素数据集合的key(如后端返回的数据的key跟默认值不一样，必须传此项)
            data     : 'data',     // 数据接口返回的数据的集合名 如：result.data = [...]
            id       : 'id',       // 地区id(举例：如果你的地区id叫：areaId, 那么这里就写 areaId)
            parentId : 'parentId', // 上级id
            name     : 'name',     // 地区名称
            code     : 'code'      // 地区代码(拼音或英文)
        },
        staticData: [], // 需要使用的静态数据数组(一般为某个国家下所有省市区平级数据)，使用静态数据时，countryId 参数必传。
        separator: '/', // {string} popup模式显示到input的选中地区的分隔符
        showType: 'popup', // popup/insert
        popupWidth: 300, // 弹窗默认总宽度
        popupExtraOffsetTop: 0, // 弹窗额外的上偏移量
        popupExtraOffsetLeft: 0, // 弹窗额外的左偏移量
        styleClass: '', // 额外类名
        levelRange: [1,4], // 地区层级范围，默认4级全部显示出来：国家/省份/城市/县区
        selectedRegionIds: [], // 已经选择的地区 regionId 数组，按地区层级从大到小，数组元素数量只能小于等于 levelRange 范围的层级数，如：[1, 20, 235, 2313] 表示：中国/广东省/广州/越秀区
        isShowAllSelects: true, // 是否显示所有 select，如为 false，则只显示最前的一个，选择后才显示后一个
        isMobileBrowser: false, // 是否为手机端模式 (仅 showType: 'popup' 时起作用)
        mobileHidePageId: null, // 要隐藏的主页面id (仅 isMobileBrowser: true 时起作用)
        mobilePageTitle: '选择所在地', // 虚拟页面标题 (仅 isMobileBrowser: true 时起作用)
        defaultText: '请选择', // placeholder/select的第一项的文字 可传 string/array(仅showType: 'insert'时)，如：'选我呀' 或 ['国家', '省份', '城市', '区域']
        onSelect: function (result, $element) { // 回调: popup的地区被点击时/select下拉框被选择时
            window.console && console.log('onSelect:', result); // 如： { regions: [{regionId: "1", regionName: "中国"}, {regionId: "20", regionName: "广东省"}], hasChild: true }
        },
        onClose: function (result, $element) { // 回调: popup模式 被关闭时
            window.console && console.log('onClose:', result);
        },
        onShow: function (result, $element) {}, // 回调: popup模式 显示时
        onComplete: function ($element) {} // 回调: 插件渲染输出完成
    };
    // 
    function RegionPicker(element, options) {
        this.$element = $(element);
        this.options = options;
        this._levels = [
            { level:0, name: '国家' },
            { level:1, name: '省份' },
            { level:2, name: '城市' },
            { level:3, name: '县区' }
        ];
        this.isLoadingData;
        this.levels = [];
        this.regionListAll = {}; // 某个国家的：省份、城市、县区所有数据
        this.regionListCountries = null; // 所有国家一级的数据
        this.selectedRegionIds = []; // 回调需要返回的所有regionId
        this.selectedRegionIds_temp = [];
        this.callbackDataForPopup_temp = { regions: [], hasChild: '' };
        this.mobileShowPageId = '_pageRegionPicker'; // 要显示的虚拟页面id (仅 isMobileBrowser: true 时起作用)
            
        this.init();
    }
    RegionPicker.prototype.init = function () {
        var _this = this;
        this.templates();
        if (typeof this.options === 'string' && this.options === 'reset') {
            this.options = $.extend({}, _defaults, this.options || {});
            this.reset();
            return this;
        }
        if (typeof this.options === 'string' && this.options === 'destroy') {
            this.$element.each(function() {
                _this.$element.val('');
                $(this).unbind('click').removeClass(_classes.rendered).removeClass(_classes.trigger);
            });
            return this;
        }
        if (this.$element.hasClass(_classes.rendered)) {
            return this;
        }
        this.options = $.extend({}, _defaults, this.options || {});
        this.options.defaultText = this.options.defaultText || _defaults.defaultText;
        // 如果使用静态数据，按结构存储起来
        if (this.options.staticData.length) {
            if (Object.prototype.toString.call(this.options.staticData) !== '[object Array]') {
                throw new Error('staticData 参数必须是数组。');
            }
            if (!this.options.countryId) {
                throw new Error('使用静态数据时，countryId 参数必传。');
            }
            this.regionListAll[_countryPrefix + this.options.countryId] = this.options.staticData;
        }
        else if (!this.options.getRegionUrl) { // 不使用静态数据且没有传接口地址参数getRegionUrl时，提示一下，方便前后端联调
            window.console && console.log('getRegionUrl 参数为空');
        }

        this.$element.addClass(_classes.rendered).addClass(_classes.trigger);
        if (this.options.showType === 'popup') {
            if (this.$element[0].nodeName === 'INPUT') {
                this.$element
                    .attr('readonly', true)
                    .attr('placeholder', this.options.defaultText);
            }
            else {
                throw new Error('此插件暂只支持使用 input[type=text] 作为回显容器.');
            }
            this._init();
            this.eventsForPopupType();
        }
        else if (this.options.showType === 'insert') {
            this._init();
            if (this.options.styleClass.length) {
                this.$element.addClass(this.options.styleClass);
            }
        }
        else {
            throw new Error('showType 参数必须是：insert/popup 其中之一');
        }
    };
    // 初始化
    RegionPicker.prototype._init = function () {
        var _this = this;
        var levelRange = this.options.levelRange;
        if (levelRange && levelRange instanceof Array && levelRange.length === 2 && levelRange[1] > levelRange[0]) {
            if (!(this.options.selectedRegionIds instanceof Array)) {
                throw new Error('selectedRegionIds 必须是数组，例如：[1, 20, 235, 2313] 表示：中国/广东省/广州/越秀区');
            }
            if (this.options.selectedRegionIds.length > (levelRange[1] - levelRange[0] + 1)) {
                throw new Error('selectedRegionIds 数组元素数量只能小于等于 levelRange 范围的层级数');
            }
        }
        else {
            throw new Error('levelRange 参数必传，须是：两个地区层级范围值的数组且第二个值必须大于第一个值，例如：[2,4]');
        }
        this.selectedRegionIds = this.options.selectedRegionIds;
        this.calcLevels();
        if (_this.options.showType === 'insert') {
            _this.insert_renderContent(true); // 先构建空的select，不需要等异步数据回来后才构建
        }
        var staticData = this.regionListAll[_countryPrefix + this.options.countryId];
        if (staticData) {
            init(staticData);
        }
        else {
            this.getRegionData(function (dataList) {
                init(dataList);
            });
        }
        // 初始化(数据列表)
        function init(dataList) {
            if (_this.options.showType === 'insert' || _this.options.selectedRegionIds.length) {
                _this.initSelectedRegions(dataList);
            }
            else { // popup模式&&没有回显数据时
                _this.callbackDataForPopup = { regions: [], hasChild: true }; // 给点击body关闭时回调用
                _this.options.onComplete && _this.options.onComplete(_this.$element);
            }
        }
    };
    // 获取数据
    RegionPicker.prototype.getRegionData = function (callback, parentId) {
        var _this = this;
        var params = {
            parentId: 0, // 当 includeAllChild = true 时不能为0；当 includeAllChild = false 时0表示父级ID没有，即区域是国家的数据；
            includeAllChild: false
        };
        if (parentId) {
            params.parentId = parentId;
            params.includeAllChild = true;
        }
        else { // 初始化
            if (this.levels[0].level === 0) { // 如果从国家级开始
                if (!this.options.selectedRegionIds.length) {
                    params.parentId = 0;
                }
                params.includeAllChild = false;
            }
            else {
                params.parentId = this.options.countryId ? this.options.countryId : 1; // 如果从省级或以下开始，必须传入其上级ID，不传则默认为1
                params.includeAllChild = true;
            }
        }
        $.ajax({
            url: this.options.getRegionUrl,
            type: 'post',
            data: params,
            dataType: 'json',
            beforeSend: function () {
                _this.isLoadingData = true;
                _this.$element.addClass(_classes.triggerLoading);
            },
            success: function (result) {
                _this.isLoadingData = false;
                _this.$element.removeClass(_classes.triggerLoading);
                var dataList = result[_this.options.dataKeys.data];
                if (dataList && dataList.length) {
                    if (params.parentId) {
                        _this.regionListAll[_countryPrefix + params.parentId] = dataList;
                    }
                    else {
                        _this.regionListCountries = dataList;
                    }
                    callback && callback(dataList);
                }
            },
            error: function () {
            }
        });
    };
    // 手机端事件(弹出虚拟页面后)
    RegionPicker.prototype.eventsForMobile = function () {
        var _this = this;
        this.$mobileAddress = this.$popupWrapper.find('.rp-address');
        this.$mobileAddress.empty();
        // 确定 按钮
        this.$popupWrapper.find('.rp-btn-confirm').click(function() {
            _this.close(function () {
                _this.$element.val(_this.$mobileAddress.text());
                // 选择时不要记录地区id，点确定时才更新记录(如果打开虚拟页面没有进行任何操作就点确定的话，也不记录)
                if (_this.selectedRegionIds_temp.length) {
                    _this.selectedRegionIds = _this.selectedRegionIds_temp;
                }
                if (_this.callbackDataForPopup_temp.regions.length) {
                    _this.callbackDataForPopup = _this.callbackDataForPopup_temp;
                }
            });
        });
        // 后退 按钮
        this.$popupWrapper.find('.rp-back').click(function() {
            _this.close();
        });
    };
    // 弹出层的事件
    RegionPicker.prototype.eventsForPopupType = function () {
        var _this = this;
        if (this.options.isMobileBrowser) { // 手机端
            this.$popupWrapper = this.$popupWrapper_mobile;
            this.$popupWrapper.attr('id', this.mobileShowPageId).find('.rp-header .area-center').empty().append(this.options.mobilePageTitle);
            _utilsMobile.historyPop(); // 虚拟页面后退事件
        }
        else {
            this.$popupWrapper = this.$popupWrapper_pc;
            // 关闭
            $('body').on('click', function(event){
                var $target = $(event.target);
                if ($target.hasClass(_classes.trigger) || $target.closest('.' + _classes.trigger).length || $target.hasClass(_classes.overlay) || $target.closest('.' + _classes.overlay).length) {
                    return;
                }
                else {
                    _this.close();
                }
            });
            // 关闭
            $(window).on('resize', function(){
                _this.renderPopupPosition();
            });
        }
        // trigger
        this.$element.bind('click', function(){
            if ( ! $(this).hasClass(_classes.triggerLoading)) {
                _this.showPopup();
            }
        });
        // 切换tab
        $(document).off('click', '.regionpicker-wrapper .region-tab-menu a').on('click', '.regionpicker-wrapper .region-tab-menu a', function(){
            _this.popup_switchTabs($(this));
        });
    };
    // 切换tab
    RegionPicker.prototype.popup_switchTabs = function ($menu) {
        $menu.addClass(_classes.current).siblings().removeClass(_classes.current);
        $menu.closest('.regionpicker-wrapper').find('.region-group-wrapper .region-group').eq($menu.index()).addClass(_classes.current).siblings().removeClass(_classes.current);
    };
    // 选择某个地区
    RegionPicker.prototype.popup_selectRegion = function (event, $region) {
        var _this = this;
        var regionList;
        // 本tab组内所有同类项去除选中，选中自身
        var $regionGroup = $region.closest('.region-group');
        $regionGroup.find('.item').removeClass(_classes.current);
        $region.addClass(_classes.current);

        var regionId = $region.attr('data-id');
        var level = parseInt($regionGroup.attr('data-level'), 10);
        $regionGroup.nextAll().empty(); // 清空本tab之后所有tab内容
        // 下级数据
        if (level === 0) { // 国家级
            regionList = this.regionListAll[_countryPrefix + regionId]; // 此国家下所有子级数据
            if (regionList) { // 如果之前已经取过此国家下所有子级数据
                this.regionListAllOfCountry = regionList;
                this.popup_selectRegion_renderNextLevel(event, level, regionList, regionId, $regionGroup);
            }
            else { // 如果之前未取过此国家下所有子级数据
                this.getRegionData(function (regionList) {
                    _this.regionListAllOfCountry = regionList;
                    _this.popup_selectRegion_renderNextLevel(event, level, regionList, regionId, $regionGroup);
                }, regionId);
            }
        }
        else { // 省级及以下，所有数据都已经取回来了
            var parentId = this.options.countryId ? this.options.countryId : regionId;
            regionList = this.regionListAllOfCountry || _this.regionListAll[_countryPrefix + parentId];
            this.popup_selectRegion_renderNextLevel(event, level, regionList, regionId, $regionGroup);
        }
    };
    // 选择某个地区后渲染后一级地区 for popup
    RegionPicker.prototype.popup_selectRegion_renderNextLevel = function (event, level, regionList, parentId, $regionGroup) {
        var toBeClosed; // 是否要关闭
        var hasChild = true; // 是否有下级
        var needGroup = level < 1 ? true : false; // 国家和省份级需要分组
        if (this.options.isMobileBrowser) { // 手机端不需要分组
            needGroup = false;
        }
        var groupIndex = $regionGroup.index();
        var $nextTab = this.$popupWrapper.find('.region-tab-menu a').eq(groupIndex+1);
        regionList = this.getRegionListByParentId(regionList, parentId);
        if (regionList.length && $nextTab.length) {
            this.createRegionList(regionList, needGroup, $regionGroup.next());
            $nextTab.click();
        }
        else {
            if (event.originalEvent) { // 如果有 MouseEvent 对象，证明是手动点击，则关闭；回显时是自动模拟点击，不关闭弹层
                toBeClosed = true;
            }
            hasChild = false;
            //console.log('最后一个了');
        }
        if (event.originalEvent) { // 如果有 MouseEvent 对象，证明是手动点击，则执行回调；回显时是自动模拟点击，不触发回调
            this.callback_onSelect_forPopup(hasChild);
            if (toBeClosed) {
                if ( ! this.options.isMobileBrowser) { // 手机端，选到最后一个没得选了不自动关闭弹层
                    this.close();
                }
            }
        }
    };
    // 拼接显示的地址及回调(hasChild: 是否有下级)
    RegionPicker.prototype.callback_onSelect_forPopup = function (hasChild) {
        var _this = this;
        var regionNames = [];
        var regions = [];
        this.selectedRegionIds_temp = [];
        var $selectedItems = this.$popupWrapper.find('.region-group .current');
        $.each($selectedItems, function() {
            var self = $(this);
            var _regionId = self.attr('data-id');
            var _regionName = self.text();
            _this.selectedRegionIds_temp.push(_regionId);
            regionNames.push(_regionName);
            regions.push({ regionId: _regionId, regionName: _regionName });
        });
        if (!this.options.isMobileBrowser) { // 选择时不要记录地区id
            this.selectedRegionIds = this.selectedRegionIds_temp;
        }
        this.callbackDataForPopup_temp = { regions: regions, hasChild: hasChild };
        this.popup_outputAddress(regionNames);
        // 回调
        if ( ! this.options.isMobileBrowser) { // 手机端无此回调，没有意义，因为需要选完点确定
            this.callbackDataForPopup = this.callbackDataForPopup_temp;
            this.options.onSelect && this.options.onSelect(this.callbackDataForPopup, this.$element);
        }
    };
    // 打开弹层
    RegionPicker.prototype.showPopup = function () {
        $('.' + _classes.overlay).remove(); // 先关闭别的同类弹层
        if (this.options.isMobileBrowser) {
            this.$popupWrapper.appendTo($body);
            _utilsMobile.showFullPage(this.mobileShowPageId, this.options.mobileHidePageId);
        }
        else {
            this.$popupWrapper.appendTo($body).css({ 'width': this.options.popupWidth });
            this.renderPopupPosition();
        }
        if (this.options.styleClass.length) {
            this.$popupWrapper.addClass(this.options.styleClass);
        }
        this.popup_renderContent();
        this.options.onShow && this.options.onShow(this.callbackDataForPopup, this.$element);
    };
    // 渲染位置
    RegionPicker.prototype.renderPopupPosition = function () {
        if (this.$popupWrapper.is(':visible')) {
            this.$popupWrapper.css({
                'top'  : this.$element.offset().top + this.$element.outerHeight(false) + this.options.popupExtraOffsetTop,
                'left' : this.$element.offset().left + this.options.popupExtraOffsetLeft
            });
        }
    };
    // 渲染selects内容 构建select (isInit:是否先构建空的select，不要等异步数据回来后才构建)
    RegionPicker.prototype.insert_renderContent = function (isInit) {
        var _this = this;
        var isMultipleDefaultText; // 是否多个默认项文本
        var html = '';
        var regionList_default = []; // <select> 的第一个 <option> 数据
        var data_defaultOption = {}; // 默认的 <option> 数据
        data_defaultOption[_this.options.dataKeys.id]   = '';
        data_defaultOption[_this.options.dataKeys.name] = this.options.defaultText;
        if (typeof this.options.defaultText === 'string') {
            regionList_default.push(data_defaultOption);
        }
        else if (Object.prototype.toString.call(this.options.defaultText) === '[object Array]') { // defaultText 参数为数组时，做各种容错处理
            var textArr = this.options.defaultText;
            var levelCount = this.levels.length; // 实际要显示的地区层级数
            if (textArr.length) {
                isMultipleDefaultText = true;
                textArr.splice(levelCount); // 传参数组元素数量大于地区层级数，如：['国家', '省份', '城市', '区域', 'xxx']，levelCount = 4，则变为：['国家', '省份', '城市', '区域']
                var arrCount = textArr.length;
                if (arrCount < levelCount) { // 传参数组元素数量小于地区层级数，如：['国', '省']，levelCount = 4，则用默认的文字补齐
                    for (var i = arrCount; i < levelCount; i++) {
                        textArr.push(_defaults.defaultText);
                    }
                }
                $.each(textArr, function(index, item) {
                    var _item = {}; // 默认的 <option> 数据
                    _item[_this.options.dataKeys.id]   = '';
                    _item[_this.options.dataKeys.name] = item + '';
                    regionList_default.push(_item);
                });
            }
            else { // 数组为空时按默认文字处理
                regionList_default.push(data_defaultOption);
            }
        }
        var regionList, parentId, countryId;
        var _selectedRegionIds = this.options.selectedRegionIds;
        if (this.options.selectedRegionIds.length && this.levels[0].level === 0) {
            countryId = _selectedRegionIds[0];
            if (!this.options.countryId) {
                this.options.countryId = countryId; // levelRange: [1,4],时，且没有传 countryId 时，取 selectedRegionIds: ['1', '20', '235', '2313'] 的第一个作为 countryId
            }
        }
        else {
            countryId = this.options.countryId;
        }
        //console.log(this.levels, _selectedRegionIds);
        if (isInit) {
            if (isMultipleDefaultText) {
                $.each(this.levels, function(index, item) {
                    html += create([regionList_default[index]], item.level);
                });
            }
            else {
                $.each(this.levels, function(index, item) {
                    html += create(regionList_default, item.level);
                });
            }
        }
        else {
            var regionList_default_item;
            $.each(this.levels, function(index, item) {
                if (item.level > 0) { // 省级及以下
                    regionList = _this.regionListAll[_countryPrefix + countryId] || [];
                    if (regionList.length) {
                        if (item.level === 1) { // 省级
                            parentId = countryId;
                        }
                        else {
                            parentId = _selectedRegionIds[index-1];
                        }
                        if (parentId) {
                            regionList = _this.getRegionListByParentId(regionList, parentId);
                        }
                        else {
                            regionList = [];
                        }
                    }
                }
                else {
                    regionList = _this.regionListCountries;
                }
                if (isMultipleDefaultText) {
                    regionList_default_item = [regionList_default[index]];
                }
                else {
                    regionList_default_item = regionList_default;
                }
                regionList = regionList_default_item.concat(regionList);
                html += create(regionList, item.level);
            });
        }
        this.$element.empty().append(html);
        var $selects = this.$element.find('select');
        $selects.change(function(event) {
            _this.insert_selectRegion(event, $(this));
        });
        // 初始化显示已经选中的
        $.each($selects, function(index) {
            var self = $(this);
            var selectedRegionId = _this.options.selectedRegionIds[index];
            if (selectedRegionId) {
                self.val(selectedRegionId);
            }
            if (index > 0) {
                if ( ! _this.options.isShowAllSelects) {
                    self.hide();
                }
            }
        });
        // 创建select dom
        function create(regionList, level) {
            var html = '<select data-level="' + level + '" data-defaultText="' + regionList[0][_this.options.dataKeys.name] + '">';
            $.each(regionList, function(index, item) {
                html += _this.tpl_select_options.formatString(item[_this.options.dataKeys.id], item[_this.options.dataKeys.name]);
            });
            html += '</select>';
            return html;
        }
    };
    // 构建select
    RegionPicker.prototype.insert_createSelectOptions = function (regionList) {
        var _this = this;
        var html = '';
        $.each(regionList, function(index, item) {
            html += _this.tpl_select_options.formatString(item[_this.options.dataKeys.id], item[_this.options.dataKeys.name]);
        });
        return html;
    };
    // select 把 select 设置为初始状态，即只有一个 option 项
    // $selects: 一般为某个 select 之后所有的兄弟节点
    RegionPicker.prototype.insert_selectSetDefault = function ($selects) {
        var _this = this;
        $.each($selects, function() {
            var self = $(this);
            var _option = _this.tpl_select_options.formatString('', self.attr('data-defaultText'));
            self.empty().append(_option); // 清空本select之后所有select内容，填充默认选项
        });
    };
    // select 选择事件
    RegionPicker.prototype.insert_selectRegion = function (event, $select) {
        var _this = this;
        var regionList;
        var regionId = $select.val();
        var level = parseInt($select.attr('data-level'), 10);
        var $nextAll = $select.nextAll();
        if ( ! this.options.isShowAllSelects) { // 如果是 select 逐个显示出来
            $nextAll.hide();
        }
        this.insert_selectSetDefault($nextAll); // 清空本select之后所有select内容(设置为初始状态，即只有一个)
        // 下级数据
        if (level === 0) { // 国家级
            regionList = this.regionListAll[_countryPrefix + regionId]; // 此国家下所有子级数据
            if (regionList) { // 如果之前已经取过此国家下所有子级数据
                this.regionListAllOfCountry = regionList;
                this.insert_selectRegion_renderNextClass(regionList, regionId, $select);
            }
            else { // 如果之前未取过此国家下所有子级数据
                this.getRegionData(function (regionList) {
                    _this.regionListAllOfCountry = regionList;
                    _this.insert_selectRegion_renderNextClass(regionList, regionId, $select);
                }, regionId);
            }
        }
        else { // 省级及以下，所有数据都已经取回来了
            var parentId = this.options.countryId ? this.options.countryId : regionId;
            regionList = this.regionListAllOfCountry || _this.regionListAll[_countryPrefix + parentId];
            this.insert_selectRegion_renderNextClass(regionList, regionId, $select);
        }
    };
    // 选择某个地区后渲染后一级地区 for insert
    RegionPicker.prototype.insert_selectRegion_renderNextClass = function (regionList, parentId, $select) {
        var hasChild = true; // 是否有下级
        regionList = this.getRegionListByParentId(regionList, parentId);
        if (regionList.length) {
            var $selectNext = $select.next();
            if ($selectNext.length) {
                $selectNext.show().append(this.insert_createSelectOptions(regionList));
            }
            else {
                hasChild = false; // 比如：生成[1,2]两级，即[国家,省份]，当选择省份这级时，数据上来说它是有子级的，但这里只生成1、2级，所以也要当作没有子级
            }
        }
        else {
            hasChild = false;
            //console.log('最后一个了');
        }
        this.callback_onSelect_forInsert(hasChild);
    };
    // 回调(是否有下级)
    RegionPicker.prototype.callback_onSelect_forInsert = function (hasChild) {
        var _this = this;
        var regions = [];
        this.selectedRegionIds = [];
        $.each(this.$element.find('select'), function() {
            var self = $(this);
            var _regionId = self.val();
            if (_regionId) {
                var _regionName = self.find('option:selected').text();
                _this.selectedRegionIds.push(_regionId);
                regions.push({ regionId: _regionId, regionName: _regionName });
            }
        });
        // 回调
        this.options.onSelect && this.options.onSelect({ regions: regions, hasChild: hasChild }, this.$element);
    };
    // 显示拼接的选中地区(到input里)
    RegionPicker.prototype.popup_outputAddress = function (regionNames, isInit) { // isInit: 是否为初始化回显
        //console.log(regionNames);
        var address = regionNames.join(this.options.separator);
        if (isInit) {
            this.$element.val(address);
        }
        else {
            if (this.options.isMobileBrowser) { // 手机端
                this.$mobileAddress.empty().append(address);
            }
            else {
                this.$element.val(address);
            }
        }
    };
    // 渲染弹层内容
    RegionPicker.prototype.popup_renderContent = function () {
        this.echoPopupRegionNames_mobile = [];
        var _this = this;
        if (this.isLoadingData) {
            return;
        }
        if (this.$element.hasClass(_classes.reseted)) { // 如果为重置状态
            this.selectedRegionIds = [];
            this.$element.removeClass(_classes.reseted);
        }
        this.popup_createLevels();
        var needGroup = _this.levels[0].level < 2 ? true : false; // 国家和省份级需要分组
        if (this.options.isMobileBrowser) {
            needGroup = false; // 手机端不需要分组
            this.eventsForMobile();
        }
        if (this.options.countryId) { // 省级及以下
            var regionList = this.regionListAll[_countryPrefix + this.options.countryId];
            if (regionList) {
                regionList = _this.getRegionListByParentId(regionList, _this.options.countryId);
                _this.createRegionList(regionList, needGroup);
            }
        }
        else { // 国家级
            if (this.regionListCountries) {
                _this.createRegionList(this.regionListCountries, needGroup);
            }
        }
    };
    // 给input/selects回显已经选择的地区们
    RegionPicker.prototype.initSelectedRegions = function (regionList) {
        var _this = this;
        var arrRegions = [];
        var region, regionId;
        if (this.levels[0].level === 0) { // 如果从国家级开始
            regionId = this.options.selectedRegionIds[0];
            if ( ! regionId) {
                if (this.options.showType === 'insert') { // insert 非回显模式直接走 this.insert_renderContent();
                    output(arrRegions);
                }
                return;
            }
            region = _this.getRegionByRegionId(regionList, parseInt(regionId, 10));
            arrRegions.push(region);
            // 省级及以下还有值的话，去取它们的数据完成后再匹配
            var selectedRegionIds = this.options.selectedRegionIds.slice(1);
            if (selectedRegionIds.length) {
                this.getRegionData(function (regionList) {
                    $.each(selectedRegionIds, function(index, item) {
                        if (item) {
                            regionId = parseInt(item, 10);
                            region = _this.getRegionByRegionId(regionList, regionId);
                            arrRegions.push(region);
                        }
                    });
                    output(arrRegions);
                }, regionId);
            }
        }
        else { // 省级及以下
            $.each(this.options.selectedRegionIds, function(index, item) {
                if (item) {
                    regionId = parseInt(item, 10);
                    region = _this.getRegionByRegionId(regionList, regionId);
                    arrRegions.push(region);
                }
            });
            output(arrRegions);
        }
        function output(arrRegions) {
            //console.log(arrRegions);
            var regionNames = [];
            var regions = [];
            $.each(arrRegions, function(index, item) {
                if (item && item.name) {
                    var _regionId = item.id;
                    var _regionName = item.name;
                    regionNames.push(_regionName);
                    regions.push({ regionId: _regionId, regionName: _regionName });
                    _this.selectedRegionIds.push(_regionId);
                }
                else {
                    throw new Error('levelRange 参数值错误，请跟 selectedRegionIds 参数对照检查。'); // 匹配到空或 undefined 报错
                }
            });
            if (_this.options.showType === 'popup') {
                _this.popup_outputAddress(regionNames, true);
                var hasChild = regions.length < _this.levels.length ? true : false; // 传来的回显级别比要生成的层级小则为还有下级
                _this.callbackDataForPopup = { regions: regions, hasChild: hasChild }; // 给点击body关闭时回调用
            }
            else if (_this.options.showType === 'insert') {
                _this.insert_renderContent();
            }
            _this.options.onComplete && _this.options.onComplete(_this.$element);
            // 提示一下而已，不影响插件使用 (selectedRegionIds元素的值可为空，所以取消提示)
            //if (regionNames.length !== _this.options.selectedRegionIds.length) {
            //	window.console && console.log('selectedRegionIds 参数不正确，未能匹配出完整地址。');
            //}
        }
    };
    // 在全部数据中根据 parentId 取得某一级列表
    RegionPicker.prototype.getRegionByRegionId = function (regionList, regionId) {
        var _this = this;
        for (var i = 0, len = regionList.length; i < len; i++) {
            var item = regionList[i];
            if (item[_this.options.dataKeys.id] === regionId) {
                return { id: item[_this.options.dataKeys.id], name: item[_this.options.dataKeys.name] };
            }
        }
        return {};
    };
    // 在全部数据中根据 parentId 取得某一级列表
    RegionPicker.prototype.getRegionListByParentId = function (regionList, parentId) {
        var arr = [];
        parentId = parseInt(parentId, 10);
        for (var i = 0, len = regionList.length; i < len; i++) {
            var item = regionList[i];
            if (item[this.options.dataKeys.parentId] === parentId) {
                arr.push(item);
            }
        }
        return arr;
    };
    // 创建一个tab内的地区列表
    RegionPicker.prototype.createRegionList = function (regionList, needGroup, $container) {
        var _this = this;
        var html = '';
        var isInit;
        needGroup = needGroup || '';
        if ( ! $container) { // 不传 $container 即为初始化模式
            $container = this.$popupWrapper.find('.region-group').first();
            isInit = true;
        }
        if (this.options.isMobileBrowser) {
            isInit = true;
        }
        if (needGroup && regionList[0][_this.options.dataKeys.code]) { // 需要分组且支持被分组，如：Code: "guangdong"
            html += createGroup(this.groupRegionList(regionList));
        }
        else {
            html = create(regionList);
        }
        // 创建后才马上绑定事件，以防多次绑定
        $container.empty().append(html).find('.item').click(function(event) {
            _this.popup_selectRegion(event, $(this));
        });
        //console.log(isInit, this.selectedRegionIds);
        if (isInit && this.selectedRegionIds.length) {
            this.echoPopup($container, this.selectedRegionIds);
        }
        // 不需要分组
        function create(regionList) {
            var html = '';
            var tpl = _this.tpl_popup_regionList;
            if (_this.options.isMobileBrowser) {
                tpl = _this.tpl_popup_regionList_mobile;
            }
            $.each(regionList, function(index, item) {
                html += tpl.formatString(item[_this.options.dataKeys.id], item[_this.options.dataKeys.name]);
            });
            return html;
        }
        // 需要分组
        function createGroup(regionGroupList) {
            var html = '';
            $.each(regionGroupList, function(index, item) {
                if (item.list.length) {
                    html += '<dl class="type-pc"><dt>';
                    html += item.groupName;
                    html += '</dt><dd>';
                    html += create(item.list);
                    html += '</dd></dl>';
                }
            });
            return html;
        }
    };
    // 创建一个tab内的地区列表
    RegionPicker.prototype.groupRegionList = function (regionList) {
        var _this = this;
        var groups = [];
        var groupsTemp = {
            'A-G': [],
            'H-K': [],
            'L-P': [],
            'Q-U': [],
            'V-Z': []
        };
        // 先遍历分到临时组，再遍历分到真正的结构组，这样时间和空间复杂度最小
        $.each(regionList, function (index, item) {
            var firstChar = item[_this.options.dataKeys.code].substr(0, 1).toUpperCase();
            if (_groupsNameRegExp['A-G'].test(firstChar)) {
                groupsTemp['A-G'].push(item);
            }
            else if (_groupsNameRegExp['H-K'].test(firstChar)) {
                groupsTemp['H-K'].push(item);
            }
            else if (_groupsNameRegExp['L-P'].test(firstChar)) {
                groupsTemp['L-P'].push(item);
            }
            else if (_groupsNameRegExp['Q-U'].test(firstChar)) {
                groupsTemp['Q-U'].push(item);
            }
            else if (_groupsNameRegExp['V-Z'].test(firstChar)) {
                groupsTemp['V-Z'].push(item);
            }
        });
        $.each(groupsTemp, function(key, item) {
            groups.push({
                groupName: key,
                list: item
            });
        });
        groupsTemp = null;
        return groups;
    };
    // 计算层级
    RegionPicker.prototype.calcLevels = function () {
        var i = this.options.levelRange[0] - 1;
        var max = this.options.levelRange[1];
        for (i; i < max; i++) {
            this.levels.push(this._levels[i]);
        }
        if (this.levels[0].level === 0 && !this.options.selectedRegionIds.length) { // 如果从国家级开始且不是回显，又传了options.countryId的话，则把它设为空
            this.options.countryId = null;
        }
        if (this.levels[0].level > 0 && !this.options.countryId) {
            throw new Error('countryId 参数值错误，省级及以下必须传 countryId。');
        }
    };
    // 创建层级 tabmenu 和 group
    RegionPicker.prototype.popup_createLevels = function () {
        var _this = this;
        // _this.regionList
        var htmlTabMenu = '';
        var htmlGroupStructure = ''; // 内容组框架
        $.each(this.levels, function(index, item) {
            var className = '';
            if (index === 0) {
                className = _classes.current;
            }
            htmlTabMenu += _this.tpl_popup_menu.formatString(className, item.level, item.name);
            htmlGroupStructure += _this.tpl_popup_group_structure.formatString(className, item.level, item.name);
        });
        //console.log(this.levels);
        this.$popupWrapper.find('.region-tab-menu').empty().append(htmlTabMenu);
        this.$popupWrapper.find('.region-group-wrapper').empty().append(htmlGroupStructure);
    };
    // 
    RegionPicker.prototype.templates = function () {
        this.tpl_select_options = '<option value="{0}">{1}</option>';
        this.tpl_popup_menu = '<a href="javascript:;" class="{0}" data-level="{1}">{2}</a>';
        this.tpl_popup_group_structure = '<div class="region-group {0}" data-level="{1}"><!-- 请先选择上一级 --></div>';
        this.tpl_popup_regionList = '<a class="item" href="javascript:;" data-id="{0}" title="{1}">{1}</a>';
        this.tpl_popup_regionList_mobile = '<dl class="item" data-id="{0}" title="{1}"><dt>{1}</dt><dd></dd></dl>';
        this.tpl_popup_regionList_groupby = '<div class="region-group {0}" data-level="{1}">{2}</div>';
        this.$popupWrapper_pc = $('\
            <div class="regionpicker-popup-overlay" id="">\
                <div class="regionpicker-wrapper">\
                    <div class="region-tab-menu">\
                        <!-- <a href="javascript:;" class="current">省份</a>\
                        <a href="javascript:;" class="">城市</a>\
                        <a href="javascript:;" class="">县区</a> -->\
                    </div>\
                    <div class="region-group-wrapper">\
                        <!-- <div class="region-group current">省</div>\
                        <div class="region-group">市</div>\
                        <div class="region-group">区</div> -->\
                    </div>\
                </div>\
            </div>');
        // 手机端
        this.$popupWrapper_mobile = $('\
            <div class="page-regionPicker" id="">\
                <div class="rp-header">\
                    <div class="rp-fixed">\
                        <div class="rp-wrapper">\
                            <div class="top-bar">\
                                <div class="area area-left">\
                                    <a class="rp-back" href="javascript:void(0);"><i class="icon-back">&lt;</i><span class="txt">返回</span></a>\
                                </div>\
                                <div class="area area-center"><!-- 虚拟页面标题 --></div>\
                                <div class="area area-right">&nbsp;</div>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
                <div class="regionpicker-wrapper">\
                    <div class="region-tab-menu">\
                        <!-- <a href="javascript:;" class="current">省份</a>\
                        <a href="javascript:;" class="">城市</a>\
                        <a href="javascript:;" class="">县区</a> -->\
                    </div>\
                    <div class="region-group-wrapper">\
                        <!-- <div class="region-group current">省</div>\
                        <div class="region-group">市</div>\
                        <div class="region-group">区</div> -->\
                    </div>\
                </div>\
                <div class="rp-footer">\
                    <div class="rp-fixed">\
                        <div class="rp-wrapper">\
                            <div class="rp-address"><!-- 中国>广东省>广州>越秀区 --></div>\
                            <a class="rp-btn-confirm" href="javascript:void(0);">确定</a>\
                        </div>\
                    </div>\
                </div>\
            </div>');
    };
    // 关闭popup类型的弹窗
    RegionPicker.prototype.close = function (callback) {
        var _this = this;
        if (this.$popupWrapper.is(':visible')) {
            //console.log(this.selectedRegionIds);
            if (this.options.isMobileBrowser) { // 手机端，后退以关闭虚拟页面
                window.history.go(-1);
                callback && callback();
                setTimeout(function () {
                    _this.$popupWrapper.remove();
                }, 50);
            }
            else {
                this.$popupWrapper.remove();
            }
            this.options.onClose && this.options.onClose(this.callbackDataForPopup, this.$element);
        }
    };
    // 重置为空
    RegionPicker.prototype.reset = function () {
        this.$element.val('').addClass(_classes.reseted).find('select').val(''); // insert(INPUT)/popup(DIV之类) 一起处理
        // 专门清第二个及以后的 select 的 options
        var $selects = this.$element.find('select');
        if ($selects.length) {
            var $nextAll = $selects.first().nextAll();
            this.insert_selectSetDefault($nextAll); // 清空本select之后所有select内容(设置为初始状态，即只有一个)
        }
    };
    // popup回显
    RegionPicker.prototype.echoPopup = function ($container, selectedRegionIds, levelIndex) {
        var _this = this;
        levelIndex = levelIndex || 0;
        var firstRegionId = selectedRegionIds[levelIndex];
        var $regions = $container.find('.item');
        if ($regions.length) {
            $.each($regions, function() {
                var self = $(this);
                if (self.attr('data-id') === firstRegionId) {
                    _this.echoPopupRegionNames_mobile.push($.trim(self.text()));
                    if (_this.options.isMobileBrowser) { // 手机端
                        _this.popup_outputAddress(_this.echoPopupRegionNames_mobile);
                    }
                    self.click();
                    return false;
                }
            });
        }
        if ($container.next().length) {
            this.echoPopup($container.next(), selectedRegionIds, levelIndex+1);
        }
    };

    $.fn.regionPicker = function (options) {
        return this.each(function () {
            return new RegionPicker(this, options);
        });
    };
})(jQuery, window);
